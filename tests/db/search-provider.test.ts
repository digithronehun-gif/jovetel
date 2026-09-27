import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { refreshCatalogStats } from '../../src/lib/ingestion/pipeline/stats'
import { PostgresSearch } from '../../src/lib/search/postgres'
import { DEFAULT_STATE, parseSearchState } from '../../src/lib/search/state'
import type { SearchState } from '../../src/lib/search/types'
import { createTestDatabase } from './prepare'

/**
 * A PostgresSearch szemantikája kis, kézzel összerakott adaton (PRODUCT_SPEC 5.2 és a F4 pontosításai):
 *  P1 „Levendulás arckrém”  (Xmárka, zsíros)             A: 9 000 (+990 → 9 990)   B: 9 500 (ingyenes) → legjobb B 9 500
 *  P2 „Rózsás arckrém”      (Ymárka, száraz, illatmentes) A: 12 000 (ingyenes, küszöb felett)
 *  P3 „Fügés arckrém”       (Xmárka)                     B: 5 000, de 72 órája láttuk → nem jelenik meg
 *  P4 „Vaníliás testápoló”  (Ymárka)                     B: 3 000, nincs készleten
 */
let sql: postgres.Sql
let search: PostgresSearch
const NOW = new Date('2026-09-23T10:00:00Z')
const s = (qs: string, extra: Partial<SearchState> = {}) => parseSearchState(new URLSearchParams(qs), extra)

beforeAll(async () => {
  const url = await createTestDatabase('jovetel_test_search_provider')
  sql = postgres(url, { max: 4, prepare: false, onnotice: () => {} })
  search = new PostgresSearch(sql)
  const [n] = await sql<{ id: string }[]>`insert into public.networks (code, name) values ('awin', 'Awin') returning id`
  const merchant = async (slug: string, fee: number, threshold: number | null, quality: number) =>
    (
      await sql<{ id: string }[]>`
        insert into public.merchants (network_id, slug, name, status, shipping_fee_huf, free_shipping_threshold_huf, is_comparison_allowed, quality_score)
        values (${n!.id}, ${slug}, ${slug.toUpperCase()}, 'active', ${fee}, ${threshold}, true, ${quality}) returning id`
    )[0]!.id
  const A = await merchant('bolt-a', 990, 10000, 0.9)
  const B = await merchant('bolt-b', 0, null, 0.5)
  const brand = async (slug: string, name: string) =>
    (await sql<{ id: string }[]>`insert into public.brands (slug, name) values (${slug}, ${name}) returning id`)[0]!.id
  const X = await brand('xmarka', 'Xmárka')
  const Y = await brand('ymarka', 'Ymárka')
  const [cat] = await sql<{ id: string }[]>`insert into public.categories (slug, name, path) values ('arckrem', 'Arckrém', 'szepsegapolas/arcapolas/arckrem') returning id`
  const product = async (slug: string, name: string, brandId: string, brandName: string, tags: string[]) => {
    const [p] = await sql<{ id: string }[]>`
      insert into public.products (slug, name, brand_id, brand_name, category_id, category_text)
      values (${slug}, ${name}, ${brandId}, ${brandName}, ${cat!.id}, 'Szépségápolás Arcápolás Arckrém') returning id`
    for (const t of tags) await sql`insert into public.product_tags (product_id, tag, source) values (${p!.id}, ${t}, 'rule')`
    return p!.id
  }
  const offer = async (p: string, m: string, sku: string, price: number, o: { inStock?: boolean; seenHoursAgo?: number } = {}) =>
    sql`insert into public.offers (product_id, merchant_id, merchant_sku, url, price_huf, in_stock, last_seen_at)
      values (${p}, ${m}, ${sku}, ${`https://bolt.example/${sku}`}, ${price}, ${o.inStock ?? true},
        ${new Date(NOW.getTime() - (o.seenHoursAgo ?? 1) * 3600e3).toISOString()}::timestamptz)`
  const P1 = await product('p1', 'Levendulás arckrém', X, 'Xmárka', ['skin_type:zsiros'])
  const P2 = await product('p2', 'Rózsás arckrém', Y, 'Ymárka', ['skin_type:szaraz', 'free_from:illatanyag'])
  const P3 = await product('p3', 'Fügés arckrém', X, 'Xmárka', [])
  const P4 = await product('p4', 'Vaníliás testápoló', Y, 'Ymárka', [])
  await offer(P1, A, 'a1', 9000)
  await offer(P1, B, 'b1', 9500)
  await offer(P2, A, 'a2', 12000)
  await offer(P3, B, 'b3', 5000, { seenHoursAgo: 72 })
  await offer(P4, B, 'b4', 3000, { inStock: false })
  await refreshCatalogStats(sql, NOW)
})
afterAll(async () => {
  await sql?.end()
})

const slugs = (r: { hits: { slug: string }[] }) => r.hits.map((h) => h.slug)

describe('PostgresSearch', () => {
  it('csak friss árú termék jelenik meg; a megjelenített ár a legjobb TELJES ár', async () => {
    const r = await search.search(DEFAULT_STATE, { now: NOW })
    expect(r.total).toBe(3)
    expect(slugs(r).sort()).toEqual(['p1', 'p2', 'p4'])
    const p1 = r.hits.find((h) => h.slug === 'p1')!
    expect(p1).toMatchObject({ merchantName: 'BOLT-B', cost: { priceHuf: 9500, shippingHuf: 0, totalHuf: 9500 } })
    const p2 = r.hits.find((h) => h.slug === 'p2')!
    expect(p2.cost).toMatchObject({ priceHuf: 12000, shippingHuf: 0, totalHuf: 12000, freeShipping: true })
  })

  it('ár-szűrő a teljes árra; az ársáv-facet az ár-szűrő nélkül számol', async () => {
    const r = await search.search(s('ar_max=9999'), { now: NOW })
    expect(slugs(r).sort()).toEqual(['p1', 'p4'])
    expect(Object.fromEntries(r.facets.priceBands.map((b) => [b.value, b.count]))).toEqual({ u5: 1, '5_15': 2, '15_30': 0, o30: 0 })
  })

  it('bolt-szűrő: a megjelenített ajánlat a kiválasztott bolté (P1 az A boltnál 9 000 + 990 Ft szállítás)', async () => {
    const r = await search.search(s('bolt=bolt-a'), { now: NOW })
    expect(slugs(r).sort()).toEqual(['p1', 'p2'])
    expect(r.hits.find((h) => h.slug === 'p1')).toMatchObject({ merchantName: 'BOLT-A', cost: { priceHuf: 9000, shippingHuf: 990, totalHuf: 9990 } })
    // a bolt-facet a bolt-szűrő nélküli halmazon számol
    expect(Object.fromEntries(r.facets.merchants.map((m) => [m.value, m.count]))).toEqual({ 'bolt-a': 2, 'bolt-b': 2 })
  })

  it('diszjunktív facetek: a márka-csoport számai a márka-szűrő nélkül, a többi csoportéi vele', async () => {
    const r = await search.search(s('marka=xmarka'), { now: NOW })
    expect(slugs(r)).toEqual(['p1'])
    expect(Object.fromEntries(r.facets.brands.map((b) => [b.value, b.count]))).toEqual({ xmarka: 1, ymarka: 2 })
    expect(r.facets.brands.find((b) => b.value === 'xmarka')?.selected).toBe(true)
    expect(Object.fromEntries(r.facets.skin.map((x) => [x.value, x.count]))).toMatchObject({ zsiros: 1, szaraz: 0 })
  })

  it('bőrtípus VAGY, „mentes” ÉS; készleten és valódi akció facet-számok', async () => {
    expect(slugs(await search.search(s('bor=zsiros,szaraz'), { now: NOW })).sort()).toEqual(['p1', 'p2'])
    expect(slugs(await search.search(s('mentes=illatanyag'), { now: NOW }))).toEqual(['p2'])
    expect((await search.search(s('mentes=illatanyag,alkohol'), { now: NOW })).total).toBe(0)
    const r = await search.search(s('keszleten=1'), { now: NOW })
    expect(slugs(r).sort()).toEqual(['p1', 'p2'])
    expect(r.facets.inStock).toBe(2)
    expect(r.facets.deal).toBe(0)
  })

  it('rendezés: legalacsonyabb teljes ár', async () => {
    expect(slugs(await search.search(s('rendezes=ar'), { now: NOW }))).toEqual(['p4', 'p1', 'p2'])
  })

  it('szöveg: ÉS-egyezés ékezet nélkül; elírásnál lazított találat, jelezve', async () => {
    const r = await search.search(s('q=rozsas arckrem'), { now: NOW })
    expect(slugs(r)[0]).toBe('p2')
    expect(r.relaxed).toBe(true) // csak 1 teljes egyezés → a többi arckrém lazítva jön utána
    expect(slugs(r).slice(1).sort()).toEqual(['p1', 'p4']) // a kategóriaszövegben is „arckrém” áll
    const typo = await search.search(s('q=vanilias testapol'), { now: NOW })
    expect(slugs(typo)[0]).toBe('p4')
  })

  it('üres találat: a legtöbb találatot adó szűrőcsoport elhagyása', async () => {
    const state = s('marka=ymarka&bor=zsiros')
    expect((await search.search(state, { now: NOW })).total).toBe(0)
    const relax = await search.suggestRelaxation(state, { now: NOW })
    expect(relax).toMatchObject({ group: 'skin', count: 2 })
    expect(relax!.state.skin).toEqual([])
    expect(await search.suggestRelaxation(s('q=nincsilyenszo'), { now: NOW })).toBeNull()
  })

  it('a jövőbeli „most” (48 óra múlva) minden ajánlatot régivé tesz → nincs találat', async () => {
    const later = new Date(NOW.getTime() + 49 * 3600e3)
    expect((await search.search(DEFAULT_STATE, { now: later })).total).toBe(0)
  })
})
