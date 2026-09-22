/** 6. vasszabály: 48 óránál régebbi ár elrejtve vagy jelölve. */
export const STALE_AFTER_HOURS = 48
/** A rangsor „frissesség” tényezőjéhez (PRODUCT_SPEC 7.2): 12 óránál frissebb ár = 1. */
export const FRESH_WITHIN_HOURS = 12

export function priceAgeHours(checkedAt: Date | string, now: Date = new Date()): number {
  const t = checkedAt instanceof Date ? checkedAt.getTime() : Date.parse(checkedAt)
  return (now.getTime() - t) / 3_600_000
}

export function isStale(checkedAt: Date | string, now: Date = new Date()): boolean {
  return priceAgeHours(checkedAt, now) > STALE_AFTER_HOURS
}
