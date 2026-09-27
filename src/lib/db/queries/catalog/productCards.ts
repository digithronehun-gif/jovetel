import type { VerdictKind } from '../../../pricing/types'
import { STALE_AFTER_HOURS } from '../../../pricing/freshness'
import { getSql } from '../../client'

export interface ProductCardRow {
  productId: string
  slug: string
  name: string
  brandName: string | null
  imageUrl: string | null
  /** a legjobb friss (≤ 48 órás) ajánlat, vagy null */
  offer: {
    offerId: string
    merchantId: string
    merchantName: string
    priceHuf: number
    shippingHuf: number
    customsHuf: number
    totalHuf: number
    inStock: boolean
    checkedAt: Date
    verdict: VerdictKind | null
  } | null
}

/**
 * Termékkártyák adatai azonosítók szerint (pl. útmutató tételei), a keresés `product_stats` táblájából:
 * a legjobb friss ajánlat teljes árral. 48 óránál régebbi ár nem jelenik meg (6. vasszabály).
 */
export async function getProductCards(productIds: string[], now: Date = new Date()): Promise<Map<string, ProductCardRow>> {
  const out = new Map<string, ProductCardRow>()
  if (productIds.length === 0) return out
  const sql = getSql()
  const stale = new Date(now.getTime() - STALE_AFTER_HOURS * 3600e3).toISOString()
  const rows = await sql<
    {
      id: string
      slug: string
      name: string
      brand_name: string | null
      image_url: string | null
      best_offer_id: string | null
      best_merchant_id: string | null
      merchant_name: string | null
      best_price_huf: number | null
      best_shipping_huf: number | null
      best_customs_huf: number | null
      best_total_huf: number | null
      best_in_stock: boolean
      verdict: VerdictKind | null
      checked_at: Date | string | null
    }[]
  >`
    select p.id, p.slug, p.name, p.brand_name, p.image_url, ps.best_offer_id, ps.best_merchant_id, m.name as merchant_name,
      ps.best_price_huf, ps.best_shipping_huf, ps.best_customs_huf, ps.best_total_huf, coalesce(ps.best_in_stock, false) as best_in_stock,
      ps.verdict,
      case when ps.best_missed_runs = 0 and f.last_success_at is not null
        then greatest(f.last_success_at, ps.best_seen_at) else ps.best_seen_at end as checked_at
    from public.products p
    left join public.product_stats ps on ps.product_id = p.id
    left join public.merchants m on m.id = ps.best_merchant_id
    left join public.feeds f on f.id = ps.best_feed_id
    where p.id = any(string_to_array(${productIds.join(',')}::text, ',')::uuid[])`
  for (const r of rows) {
    const checkedAt = r.checked_at ? (r.checked_at instanceof Date ? r.checked_at : new Date(r.checked_at)) : null
    const fresh = checkedAt !== null && checkedAt.toISOString() >= stale
    out.set(r.id, {
      productId: r.id,
      slug: r.slug,
      name: r.name,
      brandName: r.brand_name,
      imageUrl: r.image_url,
      offer:
        fresh && r.best_offer_id && r.best_total_huf !== null && r.merchant_name
          ? {
              offerId: r.best_offer_id,
              merchantId: r.best_merchant_id!,
              merchantName: r.merchant_name,
              priceHuf: r.best_price_huf!,
              shippingHuf: r.best_shipping_huf!,
              customsHuf: r.best_customs_huf!,
              totalHuf: r.best_total_huf,
              inStock: r.best_in_stock,
              checkedAt: checkedAt!,
              verdict: r.verdict,
            }
          : null,
    })
  }
  return out
}
