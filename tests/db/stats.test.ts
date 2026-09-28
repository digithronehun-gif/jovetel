import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { rng } from '../../src/lib/db/seed/random'
import { refreshCatalogStats } from '../../src/lib/ingestion/pipeline/stats'
import { totalCost, verdict, type DailyPrice } from '../../src/lib/pricing'
import { createTestDatabase } from './prepare'

/**
 * A származtatott ár-statisztika (0009): az SQL-ben számolt teljes ár és „Valódi akció?” ítélet PONTOSAN
 * egyezik a lib/pricing TS-függvényeivel (egy forrás, két megvalósítás → paritásteszt), a frissítés csak
 * eltérésnél ír, és a legjobb ajánlat a friss, listázható ajánlatok közül jön.
 */
let sql: postgres.Sql
const NOW = new Date('2026-09-23T10:00:00Z') // budapesti nap: 2026-09-23
const TODAY = '2026-09-23'

function dayOffset(n: number): string {
  const d = new Date(`${TODAY}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

interface Case {
  sku: string
  price: number
  oldPrice: number | null
  history: DailyPrice[]
}

async function insertMerchant(slug: string, o: { fee: number; threshold: number | null; customs?: number; allowed?: boolean; status?: string; quality?: number }) {
  const [n] = await sql<{ id: string }[]>`
    insert into public.networks (code, name) values ('awin', 'Awin') on conflict (code) do update set name = excluded.name returning id`
  const [m] = await sql<{ id: string }[]>`
    insert into public.merchants (network_id, slug, name, status, shipping_fee_huf, free_shipping_threshold_huf, customs_fee_huf,
      is_comparison_allowed, quality_score)
    values (${n!.id}, ${slug}, ${slug}, ${o.status ?? 'active'}, ${o.fee}, ${o.threshold}, ${o.customs ?? 0}, ${o.allowed ?? true}, ${o.quality ?? 0.5})
    returning id`
  return m!.id
}

async function insertProduct(slug: string) {
  const [p] = await sql<{ id: string }[]>`insert into public.products (slug, name) values (${slug}, ${slug}) returning id`
  return p!.id
}

async function insertOffer(productId: string, merchantId: string, c: { sku: string; price: number; oldPrice?: number | null; inStock?: boolean; seenAt?: Date; active?: boolean }) {
  const [o] = await sql<{ id: string }[]>`
    insert into public.offers (product_id, merchant_id, merchant_sku, url, price_huf, old_price_huf, in_stock, last_seen_at, is_active)
    values (${productId}, ${merchantId}, ${c.sku}, ${`https://bolt.example/${c.sku}`}, ${c.price}, ${c.oldPrice ?? null},
      ${c.inStock ?? true}, ${(c.seenAt ?? NOW).toISOString()}::timestamptz, ${c.active ?? true})
    returning id`
  return o!.id
}

beforeAll(async () => {
  const url = await createTestDatabase('jovetel_test_stats')
  sql = postgres(url, { max: 2, prepare: false, onnotice: () => {} })
  await sql`select public.ensure_price_daily_partitions('2026-07-01'::date, 4)`
})
afterAll(async () => {
  await sql?.end()
})

describe('paritás: SQL (refresh_catalog_stats) = TS (lib/pricing)', () => {
  it('300 véletlen ajánlat + határesetek: ugyanaz a teljes ár, ablak, ítélet, kedvezmény és kiegészítés', async () => {
    const r = rng(7)
    const rules = { fee: 1290, threshold: 9990, customs: 0 }
    const merchantId = await insertMerchant('paritas', rules)
    const cases: Case[] = []
    const flat = (n: number, p: number, from = 1) => Array.from({ length: n }, (_, i) => ({ day: dayOffset(i + from), minHuf: p, lastHuf: p }))
    // határesetek: 13/14 nap, pont a 97%-os és a 105%-os küszöbön, páros elemszámú medián, régi ár
    cases.push({ sku: 'n13', price: 5000, oldPrice: null, history: flat(13, 10000) })
    cases.push({ sku: 'n14', price: 5000, oldPrice: null, history: flat(14, 10000) })
    cases.push({ sku: 'k97', price: 9700, oldPrice: null, history: flat(20, 10000) })
    cases.push({ sku: 'k97a', price: 9699, oldPrice: null, history: flat(20, 10000) })
    cases.push({ sku: 'k105', price: 10500, oldPrice: null, history: flat(20, 10000) })
    cases.push({ sku: 'k105f', price: 10501, oldPrice: null, history: flat(20, 10000) })
    cases.push({ sku: 'paros', price: 10500, oldPrice: null, history: [...flat(8, 9999), ...flat(8, 10000, 9)] })
    cases.push({ sku: 'regi', price: 12000, oldPrice: 15000, history: flat(20, 10000) })
    cases.push({ sku: 'ma', price: 9000, oldPrice: null, history: [...flat(20, 10000), { day: TODAY, minHuf: 1, lastHuf: 1 }] })
    cases.push({ sku: 'regen', price: 9000, oldPrice: null, history: [...flat(13, 10000), { day: dayOffset(31), minHuf: 9500, lastHuf: 9500 }] })
    for (let i = 0; i < 300; i++) {
      const base = r.int(800, 40000)
      const days = r.int(0, 30)
      const history: DailyPrice[] = []
      for (let d = 1; d <= 32; d++) {
        if (history.length >= days) break
        if (r.chance(0.15)) continue // hiányzó nap
        const last = Math.max(1, Math.round(base * (0.85 + r.next() * 0.3)))
        history.push({ day: dayOffset(d), minHuf: r.chance(0.2) ? Math.max(1, last - r.int(1, 500)) : last, lastHuf: last })
      }
      const price = Math.max(1, Math.round(base * (0.8 + r.next() * 0.35)))
      cases.push({ sku: `v${i}`, price, oldPrice: r.chance(0.3) ? price + r.int(-200, 5000) : null, history })
    }
    const ids = new Map<string, string>()
    for (const c of cases) {
      const productId = await insertProduct(`paritas-${c.sku}`)
      const offerId = await insertOffer(productId, merchantId, { sku: c.sku, price: c.price, oldPrice: c.oldPrice && c.oldPrice > 0 ? c.oldPrice : null })
      ids.set(c.sku, offerId)
      if (c.history.length) {
        await sql`insert into public.price_daily ${sql(
          c.history.map((h) => ({ offer_id: offerId, day: h.day, price_min_huf: h.minHuf, price_last_huf: h.lastHuf })),
        )}`
      }
    }
    await refreshCatalogStats(sql, NOW)
    const rows = await sql<
      { offer_id: string; total_huf: number; shipping_huf: number; verdict: string; days_tracked: number; min30_huf: number | null; med30_twice: number | null; real_discount_pct: number | null; feed_discount_note: boolean }[]
    >`select * from public.offer_stats where merchant_id = ${merchantId}`
    const byId = new Map(rows.map((x) => [x.offer_id, x]))
    let mismatches = 0
    const kinds = new Set<string>()
    for (const c of cases) {
      const row = byId.get(ids.get(c.sku)!)!
      const oldPrice = c.oldPrice && c.oldPrice > 0 ? c.oldPrice : null
      const v = verdict({ currentHuf: c.price, oldPriceHuf: oldPrice, history: c.history, today: TODAY })
      const cost = totalCost(c.price, { shippingFeeHuf: rules.fee, freeShippingThresholdHuf: rules.threshold, customsFeeHuf: 0 })
      const same =
        row.verdict === v.kind &&
        row.days_tracked === v.daysTracked &&
        row.min30_huf === v.min30Huf &&
        (row.med30_twice === null ? v.med30Huf === null : row.med30_twice / 2 === v.med30Huf) &&
        row.real_discount_pct === v.realDiscountPct &&
        row.feed_discount_note === v.feedDiscountNote &&
        row.total_huf === cost.totalHuf &&
        row.shipping_huf === cost.shippingHuf
      if (!same) {
        mismatches++
        console.error(c.sku, { sql: row, ts: v, cost })
      }
      kinds.add(v.kind)
    }
    expect(mismatches).toBe(0)
    // minden ítélet-típus előfordult
    expect([...kinds].sort()).toEqual(['collecting', 'deal', 'pricier', 'usual'])
    // a határesetek a spec szerint
    const kind = (sku: string) => byId.get(ids.get(sku)!)!.verdict
    expect([kind('n13'), kind('n14'), kind('k97'), kind('k97a'), kind('k105'), kind('k105f'), kind('paros'), kind('regi'), kind('ma'), kind('regen')]).toEqual([
      // 'regi': 12 000 Ft 10 000 Ft-os medián mellett, a feed kedvezményt jelez → Most drágább marad (6. vasszabály, 0010)
      'collecting', 'deal', 'usual', 'deal', 'usual', 'pricier', 'pricier', 'pricier', 'deal', 'collecting',
    ])
    expect(byId.get(ids.get('regi')!)!.feed_discount_note).toBe(true)
  })

  it('a második frissítés 0 sort ír; árváltozásnál csak az érintett ajánlat és termék íródik', async () => {
    expect(await refreshCatalogStats(sql, NOW)).toMatchObject({ offersWritten: 0, offersDeleted: 0, productsWritten: 0 })
    await sql`update public.offers set price_huf = price_huf - 1 where merchant_sku = 'k105'`
    expect(await refreshCatalogStats(sql, NOW)).toMatchObject({ offersWritten: 1, productsWritten: 1 })
  })
})

describe('legjobb ajánlat (product_stats)', () => {
  it('készleten lévő előbb, azon belül a legalacsonyabb TELJES ár; régi (48 óra+), nem listázható és inaktív ajánlat kimarad', async () => {
    const olcso = await insertMerchant('olcso-szallitas-draga', { fee: 2990, threshold: null, quality: 0.9 })
    const ingyenes = await insertMerchant('ingyenes-szallitas', { fee: 990, threshold: 5000 })
    const tiltott = await insertMerchant('nem-osszehasonlithato', { fee: 0, threshold: null, allowed: false })
    const szunetel = await insertMerchant('szunetel', { fee: 0, threshold: null, status: 'paused' })
    const p = await insertProduct('legjobb-ajanlat')
    // 5 000 + 2 990 = 7 990 vs 6 000 + 0 = 6 000 → a drágább listaár nyer a teljes költséggel
    await insertOffer(p, olcso, { sku: 'la-1', price: 5000 })
    const best = await insertOffer(p, ingyenes, { sku: 'la-2', price: 6000 })
    await insertOffer(p, tiltott, { sku: 'la-3', price: 100 })
    await insertOffer(p, szunetel, { sku: 'la-4', price: 100 })
    await insertOffer(p, ingyenes, { sku: 'la-5', price: 1000, active: false })
    await insertOffer(p, olcso, { sku: 'la-6', price: 200, seenAt: new Date(NOW.getTime() - 49 * 3600e3) })
    await insertOffer(p, ingyenes, { sku: 'la-7', price: 300, inStock: false })
    await refreshCatalogStats(sql, NOW)
    const [s] = await sql`select * from public.product_stats where product_id = ${p}`
    expect(s).toMatchObject({ best_offer_id: best, best_total_huf: 6000, best_shipping_huf: 0, best_in_stock: true, offer_count: 3 })
    // (friss és listázható: la-1, la-2, la-7) — a nem listázható kereskedők ajánlata a statisztikában sincs benne
    const [row] = await sql<{ n: number }[]>`select count(*)::int as n from public.offer_stats os join public.offers o on o.id = os.offer_id
      where o.merchant_sku in ('la-3', 'la-4', 'la-5')`
    expect(row!.n).toBe(0)
  })

  it('ha minden ajánlat elfogy, a legolcsóbb nem készleten lévő a legjobb (best_in_stock = false)', async () => {
    const m = await insertMerchant('elfogyott', { fee: 0, threshold: null })
    const p = await insertProduct('elfogyott-termek')
    await insertOffer(p, m, { sku: 'ef-1', price: 3000, inStock: false })
    await refreshCatalogStats(sql, NOW)
    const [s] = await sql`select best_total_huf, best_in_stock from public.product_stats where product_id = ${p}`
    expect(s).toEqual({ best_total_huf: 3000, best_in_stock: false })
  })

  it('a frissesség a feed utolsó sikeres futásából jön (missed_runs = 0), egyébként az ajánlat last_seen_at-jéből', async () => {
    const m = await insertMerchant('feedes-bolt', { fee: 0, threshold: null })
    const [f] = await sql<{ id: string }[]>`
      insert into public.feeds (merchant_id, format, adapter, last_success_at) values (${m}, 'csv', 'generic-csv', ${new Date(NOW.getTime() - 3600e3).toISOString()}::timestamptz) returning id`
    const p = await insertProduct('feedes-termek')
    const regi = new Date(NOW.getTime() - 72 * 3600e3)
    const o = await insertOffer(p, m, { sku: 'fb-1', price: 4000, seenAt: regi })
    const [si] = await sql<{ id: string }[]>`
      insert into public.source_items (feed_id, merchant_sku, content_hash) values (${f!.id}, 'fb-1', 'x') returning id`
    await sql`update public.offers set source_item_id = ${si!.id} where id = ${o}`
    await refreshCatalogStats(sql, NOW)
    expect((await sql`select best_offer_id from public.product_stats where product_id = ${p}`)[0]!.best_offer_id).toBe(o)
    // két kihagyott futás után a saját last_seen_at-je számít → 72 órás, nem friss
    await sql`update public.offers set missed_runs = 1 where id = ${o}`
    await refreshCatalogStats(sql, NOW)
    expect((await sql`select best_offer_id, offer_count from public.product_stats where product_id = ${p}`)[0]).toEqual({ best_offer_id: null, offer_count: 0 })
  })

  it('a címkék (csak jóváhagyott) és a kategóriaútvonal a product_stats-ba kerül', async () => {
    const [c] = await sql<{ id: string }[]>`insert into public.categories (slug, name, path) values ('szerum', 'Szérum', 'szepsegapolas/arcapolas/szerum') returning id`
    const p = await insertProduct('cimkes-termek')
    await sql`update public.products set category_id = ${c!.id} where id = ${p}`
    await sql`insert into public.product_tags (product_id, tag, source, approved, evidence) values
      (${p}, 'skin_type:zsiros', 'rule', true, null), (${p}, 'free_from:illatanyag', 'feed', true, null),
      (${p}, 'concern:rancok', 'ai_extracted', false, 'idézet')`
    await refreshCatalogStats(sql, NOW)
    const [s] = await sql`select tags, category_path from public.product_stats where product_id = ${p}`
    expect(s).toEqual({ tags: ['free_from:illatanyag', 'skin_type:zsiros'], category_path: 'szepsegapolas/arcapolas/szerum' })
  })
})
