import { unstable_cache } from 'next/cache'
import type { ShippingRules } from '../../../pricing/totalCost'
import { getSql } from '../../client'

/**
 * A termékoldal adatai (PRODUCT_SPEC 5.3) — nyilvános katalógusadat. Minden ár, készlet és szállítási adat az
 * adatbázisból jön (1. vasszabály); a teljes ár, a legjobb ajánlat és az ítélet a `lib/pricing` függvényeiből számol.
 * A dátumok ISO-szövegként utaznak, mert az eredmény az adat-gyorsítótárba (JSON) kerül.
 */
export interface ProductPageProduct {
  id: string
  slug: string
  name: string
  brandName: string | null
  categoryPath: string | null
  sizeValue: number | null
  sizeUnit: 'ml' | 'g' | 'db' | null
  description: string | null
  imageUrl: string | null
  gtin: string | null
  isIndexable: boolean
  tags: string[]
}

export interface ProductPageOffer {
  offerId: string
  merchantId: string
  merchantName: string
  merchantSlug: string
  priceHuf: number
  oldPriceHuf: number | null
  inStock: boolean
  /** ISO — az ár ellenőrzésének ideje (DATA_MODEL 8. pont) */
  checkedAt: string
  merchantQuality: number
  shipping: ShippingRules
  deliveryDaysMin: number | null
  deliveryDaysMax: number | null
  returnDays: number | null
}

export interface ProductPageHistoryRow {
  offerId: string
  day: string
  minHuf: number
  lastHuf: number
}

export interface RelatedProductRow {
  slug: string
  name: string
  brandName: string | null
  imageUrl: string | null
  merchantName: string
  priceHuf: number
  shippingHuf: number
  customsHuf: number
  totalHuf: number
  checkedAt: string
  verdict: 'deal' | 'usual' | 'pricier' | 'collecting' | null
}

export interface ProductPageData {
  product: ProductPageProduct
  offers: ProductPageOffer[]
  history: ProductPageHistoryRow[]
  related: RelatedProductRow[]
}

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString())
const HISTORY_DAYS = 90

/** Gyorsítótár nélküli betöltés (tesztekhez és a gyorsítótárazott változat belsejében). */
export async function loadProductPage(slug: string, now: Date = new Date()): Promise<ProductPageData | null> {
  const sql = getSql()
  const [p] = await sql<
    {
      id: string
      slug: string
      name: string
      brand_name: string | null
      category_path: string | null
      size_value: string | number | null
      size_unit: 'ml' | 'g' | 'db' | null
      description_clean: string | null
      image_url: string | null
      gtin: string | null
      is_indexable: boolean
      tags: string[] | null
    }[]
  >`
    select p.id, p.slug, p.name, p.brand_name, c.path as category_path, p.size_value, p.size_unit, p.description_clean,
      p.image_url, p.gtin, p.is_indexable,
      (select array_agg(t.tag order by t.tag) from public.product_tags t where t.product_id = p.id and t.approved) as tags
    from public.products p left join public.categories c on c.id = p.category_id
    where p.slug = ${slug}`
  if (!p) return null

  const offers = await sql<
    {
      offer_id: string
      merchant_id: string
      merchant_name: string
      merchant_slug: string
      price_huf: number
      old_price_huf: number | null
      in_stock: boolean
      checked_at: unknown
      quality_score: string | number
      shipping_fee_huf: number
      free_shipping_threshold_huf: number | null
      customs_fee_huf: number
      delivery_days_min: number | null
      delivery_days_max: number | null
      return_days: number | null
    }[]
  >`
    select o.id as offer_id, m.id as merchant_id, m.name as merchant_name, m.slug as merchant_slug, o.price_huf,
      o.old_price_huf, o.in_stock,
      case when o.missed_runs = 0 and f.last_success_at is not null then greatest(f.last_success_at, o.last_seen_at)
           else o.last_seen_at end as checked_at,
      m.quality_score, m.shipping_fee_huf, m.free_shipping_threshold_huf, m.customs_fee_huf,
      m.delivery_days_min, m.delivery_days_max, m.return_days
    from public.offers o
    join public.merchants m on m.id = o.merchant_id and m.status = 'active' and m.is_comparison_allowed
    left join public.source_items si on si.id = o.source_item_id
    left join public.feeds f on f.id = si.feed_id
    where o.product_id = ${p.id} and o.is_active`

  const offerIds = offers.map((o) => o.offer_id)
  const history = offerIds.length
    ? await sql<{ offer_id: string; day: string; price_min_huf: number; price_last_huf: number }[]>`
        select offer_id, to_char(day, 'YYYY-MM-DD') as day, price_min_huf, price_last_huf
        from public.price_daily
        where offer_id = any(string_to_array(${offerIds.join(',')}::text, ',')::uuid[])
          and day >= ((${now.toISOString()}::timestamptz at time zone 'Europe/Budapest')::date - ${HISTORY_DAYS}::int)
        order by day`
    : []

  // kapcsolódó termékek: ugyanaz a kategória, hasonló ársáv (a legjobb friss teljes ár 60–160%-a), friss ajánlattal
  const stale = new Date(now.getTime() - 48 * 3600e3).toISOString()
  const related = await sql<
    {
      slug: string
      name: string
      brand_name: string | null
      image_url: string | null
      merchant_name: string
      best_price_huf: number
      best_shipping_huf: number
      best_customs_huf: number
      best_total_huf: number
      checked_at: unknown
      verdict: RelatedProductRow['verdict']
    }[]
  >`
    with me as (select category_path, best_total_huf from public.product_stats where product_id = ${p.id})
    select pr.slug, pr.name, pr.brand_name, pr.image_url, m.name as merchant_name, ps.best_price_huf, ps.best_shipping_huf,
      ps.best_customs_huf, ps.best_total_huf, x.checked_at, ps.verdict
    from public.product_stats ps
    cross join me
    join public.products pr on pr.id = ps.product_id
    join public.merchants m on m.id = ps.best_merchant_id
    left join public.feeds f on f.id = ps.best_feed_id
    cross join lateral (select case when ps.best_missed_runs = 0 and f.last_success_at is not null
      then greatest(f.last_success_at, ps.best_seen_at) else ps.best_seen_at end as checked_at) x
    where ps.product_id <> ${p.id} and ps.best_offer_id is not null and ps.category_path = me.category_path
      and x.checked_at >= ${stale}::timestamptz
      and (me.best_total_huf is null or ps.best_total_huf between me.best_total_huf * 0.6 and me.best_total_huf * 1.6)
    order by abs(ps.best_total_huf - coalesce(me.best_total_huf, ps.best_total_huf)), ps.best_quality desc nulls last, pr.slug
    limit 4`

  return {
    product: {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brandName: p.brand_name,
      categoryPath: p.category_path,
      sizeValue: p.size_value === null ? null : Number(p.size_value),
      sizeUnit: p.size_unit,
      description: p.description_clean,
      imageUrl: p.image_url,
      gtin: p.gtin,
      isIndexable: p.is_indexable,
      tags: p.tags ?? [],
    },
    offers: offers.map((o) => ({
      offerId: o.offer_id,
      merchantId: o.merchant_id,
      merchantName: o.merchant_name,
      merchantSlug: o.merchant_slug,
      priceHuf: o.price_huf,
      oldPriceHuf: o.old_price_huf,
      inStock: o.in_stock,
      checkedAt: iso(o.checked_at),
      merchantQuality: Number(o.quality_score),
      shipping: {
        shippingFeeHuf: o.shipping_fee_huf,
        freeShippingThresholdHuf: o.free_shipping_threshold_huf,
        customsFeeHuf: o.customs_fee_huf,
      },
      deliveryDaysMin: o.delivery_days_min,
      deliveryDaysMax: o.delivery_days_max,
      returnDays: o.return_days,
    })),
    history: history.map((h) => ({ offerId: h.offer_id, day: h.day, minHuf: h.price_min_huf, lastHuf: h.price_last_huf })),
    related: related.map((r) => ({
      slug: r.slug,
      name: r.name,
      brandName: r.brand_name,
      imageUrl: r.image_url,
      merchantName: r.merchant_name,
      priceHuf: r.best_price_huf,
      shippingHuf: r.best_shipping_huf,
      customsHuf: r.best_customs_huf,
      totalHuf: r.best_total_huf,
      checkedAt: iso(r.checked_at),
      verdict: r.verdict,
    })),
  }
}

/** A gyorsítótár tag-jei: az ingest utáni célzott érvénytelenítéshez (`/api/revalidate`). */
export const CATALOG_TAG = 'catalog'
export const productTag = (slug: string) => `product:${slug}`

/**
 * Gyorsítótárazott változat: 1 óra, célzott érvénytelenítéssel az ingest után. (Oldal-szintű ISR helyett: a nonce-os
 * CSP miatt az oldal dinamikusan renderelődik, de az adatbázist óránként legfeljebb egyszer kérdezi termékenként.)
 * A frissesség („ár ellenőrizve”, 48 órás határ) mindig a renderelés idejéhez számol.
 */
export function getProductPage(slug: string): Promise<ProductPageData | null> {
  return unstable_cache(() => loadProductPage(slug), ['product-page', slug], {
    revalidate: 3600,
    tags: [CATALOG_TAG, productTag(slug)],
  })()
}
