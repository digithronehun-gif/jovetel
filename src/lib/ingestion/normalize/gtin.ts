/** GTIN (EAN-8, UPC-12, EAN-13, GTIN-14) ellenőrzőszám szerint; érvénytelen → null (nem elutasítás). */
export function isValidGtin(digits: string): boolean {
  if (!/^\d+$/.test(digits) || ![8, 12, 13, 14].includes(digits.length)) return false
  if (/^0+$/.test(digits)) return false
  const nums = digits.split('').map(Number)
  const check = nums.pop()!
  const sum = nums.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}

export function normalizeGtin(raw: string | undefined | null): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/[\s-]/g, '')
  return isValidGtin(digits) ? digits : null
}
