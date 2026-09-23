/**
 * Forintformázás — az EGYETLEN hely, ahol pénzösszeg szöveggé válik (CLAUDE.md 9. pont).
 * Ezres tagolás és a „Ft” előtti szóköz is nem törő szóköz (U+00A0), hogy az ár ne törjön el.
 * Felületen csak a `PriceBlock` (és a levélsablonok) hívhatják.
 */
export const NBSP = ' '

/** Egész forintot vár; tört értéket kerekít. Negatív értéknél valódi mínuszjelet (U+2212) ír. */
export function formatHuf(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(`formatHuf: érvénytelen összeg: ${value}`)
  }
  const rounded = Math.round(value)
  const sign = rounded < 0 ? '−' : ''
  const digits = Math.abs(rounded).toString()
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  return `${sign}${grouped}${NBSP}Ft`
}

/** Csak a számrész, tagolva („24 990”), pl. csúszka-címkékhez a PriceBlock-on belül. */
export function formatHufNumber(value: number): string {
  return formatHuf(value).slice(0, -3)
}

/**
 * Tömör tengelyfelirat az ártörténet-grafikonhoz: ezrekben, „e” utótaggal („12e”, „9,5e”), „Ft” nélkül —
 * a pontos ár szövegként mindig a PriceBlock-ból jelenik meg. A pénz formázása így is egy helyen marad.
 */
export function formatHufAxis(value: number): string {
  return `${(value / 1000).toLocaleString('hu-HU', { maximumFractionDigits: 1 })}e`
}
