import { randomBytes } from 'node:crypto'

/** A `click_id` (DATA_MODEL 4. pont): base62, 12 karakter, kriptografikusan véletlen (~71 bit). */
export const CLICK_ID_LENGTH = 12
export const CLICK_ID_RE = /^[0-9A-Za-z]{12}$/

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

export function newClickId(): string {
  let out = ''
  // elutasításos mintavétel: 248 = 4 · 62, így minden karakter egyenletes eloszlású (nincs modulo-torzítás)
  while (out.length < CLICK_ID_LENGTH) {
    for (const b of randomBytes(CLICK_ID_LENGTH * 2)) {
      if (b < 248) out += ALPHABET[b % 62]
      if (out.length === CLICK_ID_LENGTH) break
    }
  }
  return out
}

/** A hálózat subID mezőjéből visszaolvasott érték csak akkor `click_id`, ha pontosan a mi formátumunk. */
export function parseClickId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim()
  return CLICK_ID_RE.test(v) ? v : null
}
