import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runSeed } from '../../src/lib/db/seed/run'
import { normalizeForSearch } from '../../src/lib/format'
import { refreshCatalogStats } from '../../src/lib/ingestion/pipeline/stats'
import { PostgresSearch } from '../../src/lib/search/postgres'
import { parseSearchState } from '../../src/lib/search/state'
import type { SearchState } from '../../src/lib/search/types'
import { ROOT_DIR } from './env'
import { percentile } from './helpers'
import { createTestDatabase } from './prepare'

/**
 * F4 elfogadási kritériumok, 50 000 generált + 25 egyedi terméken:
 *  - 50 magyar tesztlekérdezés (elírással, ékezet nélkül): a várt termék ≥ 80%-nál a top 5-ben;
 *  - a keresés (találatok + facetek, szűrőkkel, kategóriával, bolttal, rendezéssel) p95 < 300 ms.
 * A mért számok: tests/.artifacts/perf/search-50k.json.
 */
interface Fixture {
  catalog: { slug: string; brand: string; name: string; category: string; price: number }[]
  queries: { q: string; expect: { slug?: string; nameIncludes?: string[] } }[]
}
const fixture = JSON.parse(readFileSync(join(ROOT_DIR, 'tests/fixtures/search-queries.json'), 'utf8')) as Fixture
const N = 50_000
const NOW = new Date()
let sql: postgres.Sql
let search: PostgresSearch

beforeAll(async () => {
  const url = await createTestDatabase('jovetel_test_search50k')
  sql = postgres(url, { max: 10, prepare: false, onnotice: () => {} })
  const t0 = Date.now()
  await runSeed(sql, { products: N, historyDays: 16, withNamedays: false, now: NOW, seed: 42 })
  // az egyedi termékek (kitalált márkák, a generált katalógus mellé)
  const [merchant] = await sql<{ id: string }[]>`select id from public.merchants where slug like 'demo-%' order by slug limit 1`
  for (const c of fixture.catalog) {
    const [p] = await sql<{ id: string }[]>`
      insert into public.products (slug, name, brand_name, brand_id, category_id, category_text, description_clean, is_indexable)
      select ${c.slug}, ${c.name}, ${c.brand}, (select id from public.brands where name = ${c.brand}),
        (select id from public.categories where path = ${c.category}),
        (select string_agg(x.name, ' ' order by length(x.path)) from public.categories x where ${c.category} like x.path || '%'),
        ${`${c.name}.`}, true
      returning id`
    await sql`insert into public.offers (product_id, merchant_id, merchant_sku, url, price_huf, last_seen_at)
      values (${p!.id}, ${merchant!.id}, ${`FIX-${c.slug}`}, ${`https://napfeny-drogeria.example/${c.slug}`}, ${c.price}, ${NOW.toISOString()}::timestamptz)`
  }
  await refreshCatalogStats(sql, NOW)
  await sql`analyze`
  console.log(`50 000 termékes adatbázis: ${((Date.now() - t0) / 1000).toFixed(1)} s`)
  search = new PostgresSearch(sql)
}, 900_000)

afterAll(async () => {
  await sql?.end()
})

const metrics: Record<string, unknown> = {}

function matches(hit: { slug: string; name: string }, e: Fixture['queries'][number]['expect']): boolean {
  if (e.slug) return hit.slug === e.slug
  const name = normalizeForSearch(hit.name)
  return (e.nameIncludes ?? []).every((x) => name.includes(x))
}

describe('keresési minőség (F4: ≥ 80% a top 5-ben)', () => {
  it('50 lekérdezés', async () => {
    expect(fixture.queries).toHaveLength(50)
    const misses: { q: string; top5: string[] }[] = []
    for (const { q, expect: e } of fixture.queries) {
      const r = await search.search(parseSearchState(new URLSearchParams({ q })), { now: NOW })
      const top5 = r.hits.slice(0, 5)
      if (!top5.some((h) => matches(h, e))) misses.push({ q, top5: top5.map((h) => h.name) })
    }
    const rate = (fixture.queries.length - misses.length) / fixture.queries.length
    metrics.quality = { queries: fixture.queries.length, hitsTop5: fixture.queries.length - misses.length, rate, misses }
    console.log(`top 5 találati arány: ${(rate * 100).toFixed(0)}%`, misses)
    expect(rate).toBeGreaterThanOrEqual(0.8)
  })
})

describe('keresési sebesség (F4: p95 < 300 ms, 50 000 termék)', () => {
  it('találatok + facetek egy kérésben, vegyes terheléssel', async () => {
    const qs = fixture.queries.map((x) => x.q)
    const scenarios: Record<string, string[]> = {
      'szöveg': qs.map((q) => `q=${encodeURIComponent(q)}`),
      'szöveg + szűrők': qs.slice(0, 25).map((q, i) =>
        [`q=${encodeURIComponent(q)}`, ['ar_max=9999', 'bor=zsiros', 'keszleten=1', 'mentes=illatanyag', 'akcio=1'][i % 5]].join('&'),
      ),
      'kategória (böngészés)': [
        'kategoria=szepsegapolas',
        'kategoria=ajandek',
        'kategoria=szepsegapolas/arcapolas',
        'kategoria=szepsegapolas/arcapolas/szerum',
        'kategoria=szepsegapolas&rendezes=ar',
        'kategoria=szepsegapolas&rendezes=kedvezmeny',
        'kategoria=szepsegapolas&rendezes=uj',
        'kategoria=szepsegapolas&ar_min=5000&ar_max=14999&keszleten=1',
        'kategoria=szepsegapolas&bor=zsiros,kombinalt&mentes=illatanyag',
        'kategoria=ajandek&oldal=10',
      ],
      'teljes katalógus': ['', 'rendezes=ar', 'akcio=1', 'marka=lumen-botanica', 'oldal=50'],
      'bolt-szűrő': [
        'bolt=demo-napfeny-drogeria',
        'bolt=demo-napfeny-drogeria,demo-illat-haza&keszleten=1',
        'kategoria=szepsegapolas&bolt=demo-borkert-patika&rendezes=ar',
        'q=szerum&bolt=demo-illat-haza',
      ],
    }
    // bemelegítés
    for (const list of Object.values(scenarios)) for (const s of list) await search.search(parseSearchState(new URLSearchParams(s)), { now: NOW })
    const all: number[] = []
    const perScenario: Record<string, { n: number; p50: number; p95: number; max: number }> = {}
    for (const [name, list] of Object.entries(scenarios)) {
      const times: number[] = []
      for (let round = 0; round < 3; round++) {
        for (const s of list) {
          const state: SearchState = parseSearchState(new URLSearchParams(s))
          const t = performance.now()
          const r = await search.search(state, { now: NOW })
          times.push(performance.now() - t)
          expect(r.facets.priceBands).toHaveLength(4)
        }
      }
      all.push(...times)
      perScenario[name] = {
        n: times.length,
        p50: Math.round(percentile(times, 50)),
        p95: Math.round(percentile(times, 95)),
        max: Math.round(Math.max(...times)),
      }
    }
    const p95 = percentile(all, 95)
    metrics.latency = { n: all.length, p50: Math.round(percentile(all, 50)), p95: Math.round(p95), max: Math.round(Math.max(...all)), perScenario }
    console.table(perScenario)
    const dir = join(ROOT_DIR, 'tests/.artifacts/perf')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'search-50k.json'), JSON.stringify({ products: N + fixture.catalog.length, measuredAt: new Date().toISOString(), ...metrics }, null, 2))
    expect(p95).toBeLessThan(300)
  })
})
