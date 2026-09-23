import type { CostBreakdown } from './types'

/** A teljes költséghez szükséges kereskedői szabályok (merchants tábla). */
export interface ShippingRules {
  shippingFeeHuf: number
  /** null: nincs ingyenes szállítás */
  freeShippingThresholdHuf: number | null
  /** EU-n kívüli kereskedőnél a vám/kezelési díj, egyébként 0 */
  customsFeeHuf: number
}

/**
 * Teljes költség (PRODUCT_SPEC 7.4) — EGY HELYEN. `teljes = ár + szállítás (+ vám)`, ahol a szállítás 0, ha az ár
 * eléri az ingyenes szállítás küszöbét. Az SQL-párja a `public.offer_total_huf()` (0009 migráció); egy DB-teszt
 * ellenőrzi, hogy a kettő ugyanazt adja.
 */
export function totalCost(priceHuf: number, rules: ShippingRules): CostBreakdown {
  if (!Number.isInteger(priceHuf) || priceHuf <= 0) throw new RangeError(`totalCost: érvénytelen ár: ${priceHuf}`)
  const freeShipping = rules.freeShippingThresholdHuf !== null && priceHuf >= rules.freeShippingThresholdHuf
  const shippingHuf = freeShipping ? 0 : Math.max(0, rules.shippingFeeHuf)
  const customsHuf = Math.max(0, rules.customsFeeHuf)
  return { priceHuf, shippingHuf, customsHuf, totalHuf: priceHuf + shippingHuf + customsHuf, freeShipping: shippingHuf === 0 }
}
