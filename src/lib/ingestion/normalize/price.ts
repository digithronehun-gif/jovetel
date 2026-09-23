/**
 * Ár-szöveg → egész forint. Kezeli: „12 990 Ft”, „12990.00 HUF”, „12,990.00”, „12.990,00”, „12990,5”.
 * Ha pont és vessző is van, az utolsó a tizedesjel; ha csak egyféle, és pontosan 3 számjegy követi,
 * ezreselválasztó („12.990” = 12 990 Ft). Nem forint pénznem → elutasítás (V1-ben nincs átváltás).
 */
export type PriceResult = { ok: true; huf: number } | { ok: false; reason: 'invalid_price' | 'currency' }

/** Ésszerű felső határ (hibás feedek ellen): 10 millió forint. */
export const MAX_PRICE_HUF = 10_000_000

const FOREIGN = /\b(eur|usd|gbp|chf|czk|pln|ron)\b|[€$£]/i

export function parseHuf(raw: string | undefined | null, currency?: string | null): PriceResult {
  if (currency && !/^\s*(huf|ft|forint)\s*$/i.test(currency)) return { ok: false, reason: 'currency' }
  if (raw == null) return { ok: false, reason: 'invalid_price' }
  const s = String(raw).trim()
  if (!s) return { ok: false, reason: 'invalid_price' }
  if (FOREIGN.test(s)) return { ok: false, reason: 'currency' }
  if (/^-|\(\s*\d/.test(s.replace(/\s/g, ''))) return { ok: false, reason: 'invalid_price' }
  let n = s
    .replace(/(huf|ft\.?|forint)/gi, '')
    .replace(/[\s  ']/g, '')
  if (!/^\d[\d.,]*$/.test(n)) return { ok: false, reason: 'invalid_price' }
  const lastDot = n.lastIndexOf('.')
  const lastComma = n.lastIndexOf(',')
  if (lastDot >= 0 && lastComma >= 0) {
    const dec = lastDot > lastComma ? '.' : ','
    const thou = dec === '.' ? ',' : '.'
    n = n.split(thou).join('').replace(dec, '.')
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? '.' : ','
    const parts = n.split(sep)
    const last = parts.at(-1)!
    if (parts.length === 2 && last.length !== 3) n = `${parts[0]}.${last}`
    else n = parts.join('')
  }
  const value = Number(n)
  if (!Number.isFinite(value)) return { ok: false, reason: 'invalid_price' }
  const huf = Math.round(value)
  if (huf <= 0 || huf > MAX_PRICE_HUF) return { ok: false, reason: 'invalid_price' }
  return { ok: true, huf }
}
