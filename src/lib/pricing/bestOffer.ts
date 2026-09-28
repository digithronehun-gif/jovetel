import { STALE_AFTER_HOURS } from './freshness'
import { totalCost, type ShippingRules } from './totalCost'
import type { CostBreakdown } from './types'

/** Egy ajánlat a legjobb ajánlat kiválasztásához. */
export interface RankableOffer {
  offerId: string
  priceHuf: number
  inStock: boolean
  /** mikor ellenőriztük az árat (DATA_MODEL 8. pont: a feed utolsó sikeres futása vagy az ajánlat last_seen_at-je) */
  checkedAt: Date
  /** aktív ajánlat, aktív kereskedő, és a program engedi az összehasonlítást */
  listable: boolean
  merchantQuality: number
  shipping: ShippingRules
}

export type RankedOffer<T extends RankableOffer> = T & { cost: CostBreakdown; fresh: boolean }

export function isFreshAt(checkedAt: Date, now: Date): boolean {
  return checkedAt.getTime() >= now.getTime() - STALE_AFTER_HOURS * 3600e3
}

/**
 * Ajánlatok a megjelenítés sorrendjében: előbb a friss, listázható ajánlatok (készleten lévő előbb, azon belül a
 * legalacsonyabb TELJES ár, egyenlőségnél a jobb bolt-minőség, végül az azonosító), utánuk a 48 óránál régebbiek
 * („nem friss” jelöléssel). Nem listázható ajánlat nem szerepel.
 */
export function rankOffers<T extends RankableOffer>(offers: T[], now: Date = new Date()): RankedOffer<T>[] {
  const ranked = offers
    .filter((o) => o.listable)
    .map((o) => ({ ...o, cost: totalCost(o.priceHuf, o.shipping), fresh: isFreshAt(o.checkedAt, now) }))
  return ranked.sort(
    (a, b) =>
      Number(b.fresh) - Number(a.fresh) ||
      Number(b.inStock) - Number(a.inStock) ||
      a.cost.totalHuf - b.cost.totalHuf ||
      b.merchantQuality - a.merchantQuality ||
      (a.offerId < b.offerId ? -1 : a.offerId > b.offerId ? 1 : 0),
  )
}

/**
 * A legjobb ajánlat (PRODUCT_SPEC 5.3, 7.4): csak friss (≤ 48 órás), listázható ajánlatból. A `product_stats` SQL-
 * frissítése (0009) ugyanezt a sorrendet használja; a `tests/fixtures/best-offer-cases.json` 20 esete mindkettőn fut.
 */
export function bestOffer<T extends RankableOffer>(offers: T[], now: Date = new Date()): RankedOffer<T> | null {
  const first = rankOffers(offers, now)[0]
  return first && first.fresh ? first : null
}
