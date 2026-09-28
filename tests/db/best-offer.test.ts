import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { refreshCatalogStats } from '../../src/lib/ingestion/pipeline/stats'
import { ROOT_DIR } from './env'
import { createTestDatabase } from './prepare'

/** F5: a 20 kézi teszteset az SQL oldalon (product_stats) is ugyanazt a legjobb ajánlatot adja, mint a TS bestOffer(). */
interface Fixture {
  merchants: Record<string, { fee: number; threshold: number | null; customs: number; quality: number; status?: string; allowed?: boolean }>
  cases: { name: string; offers: { sku: string; merchant: string; price: number; inStock?: boolean; seenHoursAgo?: number; active?: boolean; id?: string }[]; expect: string | null; expectTotal?: number }[]
}
const fixture = JSON.parse(readFileSync(join(ROOT_DIR, 'tests/fixtures/best-offer-cases.json'), 'utf8')) as Fixture
const NOW = new Date('2026-09-28T10:00:00Z')
let sql: postgres.Sql
const results = new Map<string, { sku: string | null; total: number | null }>()

beforeAll(async () => {
  sql = postgres(await createTestDatabase('jovetel_test_best_offer'), { max: 2, prepare: false, onnotice: () => {} })
  const [n] = await sql<{ id: string }[]>`insert into public.networks (code, name) values ('awin', 'Awin') returning id`
  const merchantIds = new Map<string, string>()
  for (const [slug, m] of Object.entries(fixture.merchants)) {
    const [row] = await sql<{ id: string }[]>`
      insert into public.merchants (network_id, slug, name, status, shipping_fee_huf, free_shipping_threshold_huf, customs_fee_huf,
        is_comparison_allowed, quality_score)
      values (${n!.id}, ${slug}, ${slug}, ${m.status ?? 'active'}, ${m.fee}, ${m.threshold}, ${m.customs}, ${m.allowed ?? true}, ${m.quality})
      returning id`
    merchantIds.set(slug, row!.id)
  }
  const productOf = new Map<string, string>()
  for (const [ci, c] of fixture.cases.entries()) {
    const [p] = await sql<{ id: string }[]>`insert into public.products (slug, name) values (${`eset-${ci}`}, ${c.name}) returning id`
    productOf.set(c.name, p!.id)
    for (const o of c.offers) {
      await sql`
        insert into public.offers (id, product_id, merchant_id, merchant_sku, url, price_huf, in_stock, last_seen_at, is_active)
        values (${o.id ?? sql`gen_random_uuid()`}, ${p!.id}, ${merchantIds.get(o.merchant)!}, ${`${ci}-${o.sku}`}, 'https://bolt.example/x',
          ${o.price}, ${o.inStock ?? true}, ${new Date(NOW.getTime() - (o.seenHoursAgo ?? 1) * 3600e3).toISOString()}::timestamptz,
          ${o.active ?? true})`
    }
  }
  await refreshCatalogStats(sql, NOW)
  const rows = await sql<{ product_id: string; merchant_sku: string | null; best_total_huf: number | null }[]>`
    select ps.product_id, o.merchant_sku, ps.best_total_huf
    from public.product_stats ps left join public.offers o on o.id = ps.best_offer_id`
  for (const c of fixture.cases) {
    const r = rows.find((x) => x.product_id === productOf.get(c.name))!
    results.set(c.name, { sku: r.merchant_sku ? r.merchant_sku.split('-').slice(1).join('-') : null, total: r.best_total_huf })
  }
})
afterAll(async () => {
  await sql?.end()
})

describe('legjobb ajánlat az SQL-ben (product_stats) — 20 kézi eset', () => {
  for (const c of fixture.cases) {
    it(c.name, () => {
      const r = results.get(c.name)!
      expect(r.sku).toBe(c.expect)
      if (c.expectTotal !== undefined) expect(r.total).toBe(c.expectTotal)
    })
  }
})
