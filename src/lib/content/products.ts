/**
 * Termékoldal indexelése (DATA_MODEL `products.is_indexable`, PRODUCT_SPEC 5.3 pontosítás): csak akkor, ha van
 * legalább egy friss, listázható ajánlata, ÉS a termék kézzel indexelhetőnek jelölt, vagy van érdemi (legalább
 * 120 karakteres) tisztított leírása. Friss ár nélküli vagy üres oldal nem kerül a keresők indexébe.
 */
export const PRODUCT_MIN_DESCRIPTION = 120

export function productIndexable(input: { isIndexable: boolean; description: string | null; freshOfferCount: number }): boolean {
  if (input.freshOfferCount < 1) return false
  return input.isIndexable || (input.description?.trim().length ?? 0) >= PRODUCT_MIN_DESCRIPTION
}
