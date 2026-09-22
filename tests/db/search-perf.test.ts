import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { generateProducts } from '../../src/lib/db/seed/products'
import { rng } from '../../src/lib/db/seed/random'
import { percentile } from './helpers'
import { createTestDatabase } from './prepare'

/**
 * F1 elfogadási kritérium: 50 000 generált terméken a névkeresés p95 < 50 ms.
 * Külön adatbázisban fut, hogy a többi tesztet ne befolyásolja.
 */
let sql: postgres.Sql
const N = 50_000

// Valósághű keresőkifejezések: egy szó, két szó, ékezet nélkül, márkanévvel, ragozva, elírással
const QUERIES = [
  'szérum',
  'szerum',
  'arckrém',
  'mattito arckrem',
  'parfum',
  'parfümök',
  'illatgyertya',
  'gyertya levendula',
  'c-vitaminos',
  'hialuronsavas szérum',
  'niacinamid',
  'retinol',
  'fényvédő',
  'fenyvedo spf 50',
  'napozó spray',
  'tusfürdő vanília',
  'testápoló',
  'sampon festett hajra',
  'hajbalzsam',
  'alapozó',
  'rúzs mályva',
  'szempillaspirál',
  'eau de parfum',
  'eau de toilette',
  'selyemkendő',
  'kézitáska bőr',
  'ezüst fülbevaló',
  'karkötő',
  'ajándékcsomag',
  'ajandekcsomag wellness',
  'lumen botanica',
  'hajnalpír szérum',
  'mezei derm',
  'nordfény',
  'micellás víz',
  'arctisztító gél',
  'agyagos maszk',
  'szemkörnyékápoló',
  'koffeines',
  'mattító',
  'nyugtató érzékeny',
  'ceramidos',
  'tápláló éjszakai',
  'illatosító',
  'pálcás',
  'narancsvirág',
  'borostyán',
  'strandtáska',
  'hialuronsavs',
  'eau de parfum 50 ml',
]

beforeAll(async () => {
  const url = await createTestDatabase('jovetel_test_perf')
  sql = postgres(url, { max: 2, onnotice: () => {} })
  const products = generateProducts(rng(42), N)
  for (let i = 0; i < products.length; i += 2500) {
    const chunk = products.slice(i, i + 2500).map((p) => ({
      slug: p.slug,
      name: p.name,
      brand_name: p.brand,
      category_text: p.categoryPath.replace(/\//g, ' '),
      description_clean: p.description,
      gtin: p.gtin,
    }))
    await sql`insert into public.products ${sql(chunk, 'slug', 'name', 'brand_name', 'category_text', 'description_clean', 'gtin')}`
  }
  await sql`analyze public.products`
}, 600_000)

afterAll(async () => {
  await sql?.end()
})

/** A névkeresés: public.search_products (0007-es migráció) — az F4 SearchProvider erre épít. */
async function timed(q: string) {
  const t0 = performance.now()
  const rows = await sql`
    select s.product_id, s.relevance, p.name
    from public.search_products(${q}, 24) s join public.products p on p.id = s.product_id
    order by s.relevance desc`
  return { ms: performance.now() - t0, n: rows.length }
}

describe(`névkeresés ${N.toLocaleString('hu-HU')} terméken`, () => {
  it('p95 < 50 ms (FTS + ts_rank_cd újrarangsor + trigram-visszaesés)', async () => {
    for (const q of QUERIES.slice(0, 10)) await timed(q) // bemelegítés
    const times: number[] = []
    let empty = 0
    for (let round = 0; round < 4; round++) {
      for (const q of QUERIES) {
        const r = await timed(q)
        times.push(r.ms)
        if (r.n === 0) empty++
      }
    }
    const p50 = percentile(times, 50)
    const p95 = percentile(times, 95)
    console.log(
      `névkeresés: ${times.length} lekérdezés, p50 = ${p50.toFixed(1)} ms, p95 = ${p95.toFixed(1)} ms, üres: ${empty}`,
    )
    expect(p95).toBeLessThan(50)
    expect(empty).toBe(0)
  })
})
