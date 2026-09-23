/**
 * Publikálás (ARCHITECTURE 3.4–3.7) EGY tranzakcióban, kötegenként:
 *  - `content_hash` szerint csak a változott tétel íródik (source_items, termék, ajánlat, címkék);
 *  - termék-összerendelés: a kereskedő meglévő ajánlata → GTIN-egyezés → új termék (fuzzy összevonás nincs);
 *  - `price_daily`: minden látott ajánlatra, de csak eltérés esetén ír (`least(min)`, `last`, `in_stock_any`);
 *  - a nem látott ajánlat `missed_runs`-a nő, 2 egymást követő kihagyás után inaktív;
 *  - változatlan feed újrafuttatása a katalógus-táblákban 0 írás.
 * A termék „tulajdonosa” az a kereskedő, amelyik létrehozta (`image_source_merchant_id`): csak ő írhatja felül
 * a termék szövegét és képét; a többi kereskedő csak az üres mezőket tölti ki.
 */
import type { Sql, TransactionSql } from 'postgres'
import { slugify } from '../../format/slug'
import type { NormalizedItem } from '../types'
import { readBatches } from './staging'

export const PUBLISH_BATCH = 1000

export interface PublishInput {
  feedId: string
  merchantId: string
  stagingPath: string
  /** a futás ideje (a „látva” időbélyeg) */
  seenAt: Date
  /** a futás napja Budapest szerint (YYYY-MM-DD), az ártörténet kulcsa */
  day: string
  /** az érvényes tételek SKU-i (a nem látott ajánlatok felismeréséhez) */
  seenSkus: Iterable<string>
  /** kategória-azonosító → keresési szöveg (a kategória-útvonal nevei) */
  categoryText: ReadonlyMap<string, string>
}

export interface PublishStats {
  changed: number
  newProducts: number
  newOffers: number
  reactivated: number
  missed: number
  deactivated: number
  priceDailyWritten: number
}

type Tx = TransactionSql<Record<string, never>>
// Megjegyzés: a dátumot ISO-szövegként, a JSON-t szövegként adjuk át (`::timestamptz`, `::jsonb`), mert az
// alkalmazás közös postgres.js-kliensén a Drizzle kikapcsolja a Date- és JSON-szerializálót (a JSON-t
// `::text::jsonb`-vel, mert a sima `::jsonb` cast a postgres.js-t JSON-szerializálásra késztetné).

function shortHash(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0).toString(36).slice(0, 6)
}

async function upsertBrands(tx: Tx, items: NormalizedItem[], cache: Map<string, string>): Promise<void> {
  const missing = new Map<string, string>()
  for (const i of items) if (i.brandSlug && i.brandName && !cache.has(i.brandSlug)) missing.set(i.brandSlug, i.brandName)
  if (!missing.size) return
  const slugs = [...missing.keys()]
  await tx`
    insert into public.brands (slug, name)
    select s, n from unnest(${tx.array(slugs)}::text[], ${tx.array([...missing.values()])}::text[]) as t(s, n)
    on conflict (slug) do nothing`
  const rows = await tx<{ id: string; slug: string }[]>`select id, slug from public.brands where slug = any(${tx.array(slugs)}::text[])`
  for (const r of rows) cache.set(r.slug, r.id)
}

async function publishBatch(tx: Tx, input: PublishInput, batch: NormalizedItem[], brands: Map<string, string>, stats: PublishStats) {
  const skus = batch.map((i) => i.sku)
  const existing = await tx<{ merchant_sku: string; content_hash: string }[]>`
    select merchant_sku, content_hash from public.source_items
    where feed_id = ${input.feedId} and merchant_sku = any(${tx.array(skus)}::text[])`
  const known = new Map(existing.map((r) => [r.merchant_sku, r.content_hash]))
  const changed = batch.filter((i) => known.get(i.sku) !== i.contentHash)
  if (!changed.length) return
  stats.changed += changed.length

  await upsertBrands(tx, changed, brands)

  // 1. source_items (tisztított payload)
  const sourceRows = await tx<{ id: string; merchant_sku: string }[]>`
    insert into public.source_items (feed_id, merchant_sku, content_hash, payload, first_seen_at, last_seen_at)
    select ${input.feedId}, s, h, p::jsonb, ${input.seenAt.toISOString()}::timestamptz, ${input.seenAt.toISOString()}::timestamptz
    from unnest(${tx.array(changed.map((i) => i.sku))}::text[], ${tx.array(changed.map((i) => i.contentHash))}::text[],
                ${tx.array(changed.map((i) => JSON.stringify({ ...i, contentHash: undefined })))}::text[]) as t(s, h, p)
    on conflict (feed_id, merchant_sku) do update
      set content_hash = excluded.content_hash, payload = excluded.payload, last_seen_at = excluded.last_seen_at
    returning id, merchant_sku`
  const sourceId = new Map(sourceRows.map((r) => [r.merchant_sku, r.id]))

  // 2. termék-összerendelés: saját ajánlat → GTIN → új
  const ownOffers = await tx<{ merchant_sku: string; product_id: string }[]>`
    select merchant_sku, product_id from public.offers
    where merchant_id = ${input.merchantId} and merchant_sku = any(${tx.array(changed.map((i) => i.sku))}::text[])`
  const productBySku = new Map(ownOffers.map((r) => [r.merchant_sku, r.product_id]))
  const gtins = [...new Set(changed.filter((i) => i.gtin && !productBySku.has(i.sku)).map((i) => i.gtin!))]
  if (gtins.length) {
    const byGtin = await tx<{ gtin: string; id: string }[]>`
      select distinct on (gtin) gtin, id from public.products
      where gtin = any(${tx.array(gtins)}::text[]) order by gtin, created_at`
    const g = new Map(byGtin.map((r) => [r.gtin, r.id]))
    for (const i of changed) if (!productBySku.has(i.sku) && i.gtin && g.has(i.gtin)) productBySku.set(i.sku, g.get(i.gtin)!)
  }

  // 3. új termékek (egyedi slug; ütközésnél determinisztikus utótag)
  const fresh = changed.filter((i) => !productBySku.has(i.sku))
  const freshSkus = new Set(fresh.map((i) => i.sku))
  // ugyanabban a kötegben azonos GTIN → egy termék
  const keyOf = (i: NormalizedItem) => (i.gtin ? `g:${i.gtin}` : `s:${i.sku}`)
  const freshByKey = new Map<string, NormalizedItem>()
  for (const i of fresh) if (!freshByKey.has(keyOf(i))) freshByKey.set(keyOf(i), i)
  if (freshByKey.size) {
    const list = [...freshByKey.values()]
    const base = list.map((i) => slugify(`${i.brandName ?? ''} ${i.name}`, 90) || 'termek')
    const taken = new Set(
      (await tx<{ slug: string }[]>`select slug from public.products where slug = any(${tx.array(base)}::text[])`).map((r) => r.slug),
    )
    const slugs = list.map((i, k) => {
      let s = base[k]!
      if (taken.has(s)) s = `${s}-${shortHash(`${input.merchantId}:${i.sku}`)}`
      taken.add(s)
      return s
    })
    const inserted = await tx<{ id: string; slug: string }[]>`
      insert into public.products (slug, brand_id, category_id, name, brand_name, category_text, gtin, size_value,
        size_unit, description_clean, image_url, image_source_merchant_id)
      select slug, brand_id, category_id, name, brand_name, category_text, gtin, size_value, size_unit, description,
        image_url, ${input.merchantId}
      from unnest(${tx.array(slugs)}::text[], ${tx.array(list.map((i) => (i.brandSlug ? (brands.get(i.brandSlug) ?? null) : null)))}::uuid[],
        ${tx.array(list.map((i) => i.categoryId))}::uuid[], ${tx.array(list.map((i) => i.name))}::text[], ${tx.array(list.map((i) => i.brandName))}::text[],
        ${tx.array(list.map((i) => (i.categoryId ? (input.categoryText.get(i.categoryId) ?? null) : null)))}::text[],
        ${tx.array(list.map((i) => i.gtin))}::text[], ${tx.array(list.map((i) => i.sizeValue))}::numeric[], ${tx.array(list.map((i) => i.sizeUnit))}::text[],
        ${tx.array(list.map((i) => i.description))}::text[], ${tx.array(list.map((i) => i.imageUrl))}::text[])
        as t(slug, brand_id, category_id, name, brand_name, category_text, gtin, size_value, size_unit, description, image_url)
      returning id, slug`
    const idBySlug = new Map(inserted.map((r) => [r.slug, r.id]))
    stats.newProducts += inserted.length
    const idByKey = new Map(list.map((i, k) => [keyOf(i), idBySlug.get(slugs[k]!)!]))
    for (const j of fresh) productBySku.set(j.sku, idByKey.get(keyOf(j))!)
  }

  // 4. meglévő termékek frissítése: a tulajdonos felülír, a többi kereskedő csak az üres mezőt tölti ki;
  //    csak tényleges eltérésnél ír (a gyakori, csak árat érintő változásnál a termék nem íródik)
  const updates = changed.filter((i) => !freshSkus.has(i.sku))
  if (updates.length) {
    await tx`
      with u as (
        select * from unnest(${tx.array(updates.map((i) => productBySku.get(i.sku)!))}::uuid[], ${tx.array(updates.map((i) => i.name))}::text[],
          ${tx.array(updates.map((i) => i.description))}::text[], ${tx.array(updates.map((i) => i.imageUrl))}::text[],
          ${tx.array(updates.map((i) => (i.brandSlug ? (brands.get(i.brandSlug) ?? null) : null)))}::uuid[], ${tx.array(updates.map((i) => i.brandName))}::text[],
          ${tx.array(updates.map((i) => i.categoryId))}::uuid[],
          ${tx.array(updates.map((i) => (i.categoryId ? (input.categoryText.get(i.categoryId) ?? null) : null)))}::text[],
          ${tx.array(updates.map((i) => i.gtin))}::text[], ${tx.array(updates.map((i) => i.sizeValue))}::numeric[], ${tx.array(updates.map((i) => i.sizeUnit))}::text[])
          as u(id, name, description, image_url, brand_id, brand_name, category_id, category_text, gtin, size_value, size_unit)
      ),
      calc as (
        select p.id,
          case when own then u.name else p.name end as name,
          case when own then coalesce(u.description, p.description_clean) else coalesce(p.description_clean, u.description) end as description_clean,
          case when own then coalesce(u.image_url, p.image_url) else coalesce(p.image_url, u.image_url) end as image_url,
          case when own then coalesce(u.brand_id, p.brand_id) else coalesce(p.brand_id, u.brand_id) end as brand_id,
          case when own then coalesce(u.brand_name, p.brand_name) else coalesce(p.brand_name, u.brand_name) end as brand_name,
          case when own then coalesce(u.category_id, p.category_id) else coalesce(p.category_id, u.category_id) end as category_id,
          case when own then coalesce(u.category_text, p.category_text) else coalesce(p.category_text, u.category_text) end as category_text,
          coalesce(p.gtin, u.gtin) as gtin,
          case when own then coalesce(u.size_value, p.size_value) else coalesce(p.size_value, u.size_value) end as size_value,
          case when own then coalesce(u.size_unit, p.size_unit) else coalesce(p.size_unit, u.size_unit) end as size_unit,
          coalesce(p.image_source_merchant_id, ${input.merchantId}::uuid) as owner
        from public.products p
        join u on u.id = p.id
        cross join lateral (select p.image_source_merchant_id is null or p.image_source_merchant_id = ${input.merchantId}::uuid as own) o
      )
      update public.products p set
        name = c.name, description_clean = c.description_clean, image_url = c.image_url, brand_id = c.brand_id,
        brand_name = c.brand_name, category_id = c.category_id, category_text = c.category_text, gtin = c.gtin,
        size_value = c.size_value, size_unit = c.size_unit, image_source_merchant_id = c.owner
      from calc c
      where p.id = c.id
        and (p.name, p.description_clean, p.image_url, p.brand_id, p.brand_name, p.category_id, p.category_text, p.gtin,
             p.size_value, p.size_unit, p.image_source_merchant_id)
          is distinct from
            (c.name, c.description_clean, c.image_url, c.brand_id, c.brand_name, c.category_id, c.category_text, c.gtin,
             c.size_value, c.size_unit, c.owner)`
  }

  // 5. ajánlatok (az ár változásának ideje csak tényleges árváltozásnál lép)
  const offerRows = await tx<{ inserted: boolean }[]>`
    insert into public.offers (product_id, merchant_id, source_item_id, merchant_sku, url, deeplink_template, price_huf,
      old_price_huf, in_stock, last_seen_at, last_price_change_at, is_active, missed_runs)
    select pid, ${input.merchantId}, sid, sku, url, dl, price, old, stock, ${input.seenAt.toISOString()}::timestamptz, ${input.seenAt.toISOString()}::timestamptz, true, 0
    from unnest(${tx.array(changed.map((i) => productBySku.get(i.sku)!))}::uuid[], ${tx.array(changed.map((i) => sourceId.get(i.sku) ?? null))}::uuid[],
      ${tx.array(changed.map((i) => i.sku))}::text[], ${tx.array(changed.map((i) => i.url))}::text[], ${tx.array(changed.map((i) => i.trackingUrl))}::text[],
      ${tx.array(changed.map((i) => i.priceHuf))}::int[], ${tx.array(changed.map((i) => i.oldPriceHuf))}::int[], ${tx.array(changed.map((i) => i.inStock))}::bool[])
      as t(pid, sid, sku, url, dl, price, old, stock)
    on conflict (merchant_id, merchant_sku) do update set
      product_id = excluded.product_id, source_item_id = excluded.source_item_id, url = excluded.url,
      deeplink_template = excluded.deeplink_template, price_huf = excluded.price_huf, old_price_huf = excluded.old_price_huf,
      in_stock = excluded.in_stock, last_seen_at = excluded.last_seen_at,
      last_price_change_at = case when offers.price_huf <> excluded.price_huf then excluded.last_seen_at else offers.last_price_change_at end,
      is_active = true, missed_runs = 0
    returning (xmax = 0) as inserted`
  stats.newOffers += offerRows.filter((r) => r.inserted).length

  // 6. szabályalapú címkék: a termék tulajdonosa cseréli a készletet, a többi kereskedő csak hozzáad
  const tagPids: string[] = []
  const tagTags: string[] = []
  for (const i of changed) for (const t of i.tags) {
    tagPids.push(productBySku.get(i.sku)!)
    tagTags.push(t)
  }
  const owned = await tx<{ id: string }[]>`
    select id from public.products where id = any(${tx.array([...new Set(changed.map((i) => productBySku.get(i.sku)!))])}::uuid[])
      and image_source_merchant_id = ${input.merchantId}`
  if (owned.length) {
    await tx`
      delete from public.product_tags pt
      where pt.source = 'rule' and pt.product_id = any(${tx.array(owned.map((r) => r.id))}::uuid[])
        and not exists (select 1 from unnest(${tx.array(tagPids)}::uuid[], ${tx.array(tagTags)}::text[]) as n(pid, tag)
                        where n.pid = pt.product_id and n.tag = pt.tag)`
  }
  if (tagPids.length) {
    await tx`
      insert into public.product_tags (product_id, tag, source, approved)
      select distinct pid, tag, 'rule', true from unnest(${tx.array(tagPids)}::uuid[], ${tx.array(tagTags)}::text[]) as n(pid, tag)
      on conflict (product_id, tag) do nothing`
  }
}

export async function publish(sql: Sql, input: PublishInput): Promise<PublishStats> {
  const stats: PublishStats = { changed: 0, newProducts: 0, newOffers: 0, reactivated: 0, missed: 0, deactivated: 0, priceDailyWritten: 0 }
  await sql.begin(async (tx) => {
    const t = tx as unknown as Tx
    await t`create temp table _seen (sku text primary key) on commit drop`
    const all = [...input.seenSkus]
    for (let i = 0; i < all.length; i += 5000) {
      await t`insert into _seen select unnest(${t.array(all.slice(i, i + 5000))}::text[]) on conflict do nothing`
    }
    await t`analyze _seen`

    const brands = new Map<string, string>()
    for await (const batch of readBatches(input.stagingPath, PUBLISH_BATCH)) {
      await publishBatch(t, input, batch, brands, stats)
    }

    // újra látott, korábban kihagyott ajánlat: vissza aktívra (csak ha kell)
    const re = await t`
      update public.offers o set missed_runs = 0, is_active = true, last_seen_at = ${input.seenAt.toISOString()}::timestamptz
      from _seen s
      where o.merchant_id = ${input.merchantId} and o.merchant_sku = s.sku and (o.missed_runs > 0 or not o.is_active)`
    stats.reactivated = re.count

    // nem látott ajánlat: kihagyás +1, a 2. után inaktív (az inaktívakat már nem írjuk újra)
    const missed = await t<{ is_active: boolean }[]>`
      update public.offers o set missed_runs = o.missed_runs + 1, is_active = (o.missed_runs + 1) < 2
      where o.merchant_id = ${input.merchantId} and o.is_active
        and o.source_item_id in (select id from public.source_items where feed_id = ${input.feedId})
        and not exists (select 1 from _seen s where s.sku = o.merchant_sku)
      returning o.is_active`
    stats.missed = missed.length
    stats.deactivated = missed.filter((r) => !r.is_active).length

    // napi ártörténet minden látott ajánlatra, de csak eltérés esetén ír
    const pd = await t`
      insert into public.price_daily (offer_id, day, price_min_huf, price_last_huf, in_stock_any)
      select o.id, ${input.day}::date, o.price_huf, o.price_huf, o.in_stock
      from public.offers o join _seen s on s.sku = o.merchant_sku
      where o.merchant_id = ${input.merchantId}
      on conflict (offer_id, day) do update set
        price_min_huf = least(price_daily.price_min_huf, excluded.price_min_huf),
        price_last_huf = excluded.price_last_huf,
        in_stock_any = price_daily.in_stock_any or excluded.in_stock_any
      where price_daily.price_min_huf > excluded.price_min_huf
         or price_daily.price_last_huf <> excluded.price_last_huf
         or (not price_daily.in_stock_any and excluded.in_stock_any)`
    stats.priceDailyWritten = pd.count
  })
  return stats
}
