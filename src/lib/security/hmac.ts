import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Szerver–szerver kérések aláírása (CLAUDE.md 11. pont: cron és webhook végpontok HMAC-aláírással + időbélyeggel).
 * Aláírt üzenet: `${időbélyeg}.${törzs}`; a fejlécek: `x-jv-timestamp` (Unix mp), `x-jv-signature` (hex).
 * 5 percnél régebbi vagy jövőbeli időbélyeg elutasítva (visszajátszás ellen).
 */
export const HMAC_TOLERANCE_SEC = 300

export function signBody(secret: string, timestampSec: number, body: string): string {
  return createHmac('sha256', secret).update(`${timestampSec}.${body}`).digest('hex')
}

export function verifySignedBody(
  secret: string | undefined,
  headers: { timestamp: string | null; signature: string | null },
  body: string,
  nowMs: number = Date.now(),
): boolean {
  if (!secret || secret.length < 16 || !headers.timestamp || !headers.signature) return false
  if (!/^\d{9,12}$/.test(headers.timestamp) || !/^[0-9a-f]{64}$/.test(headers.signature)) return false
  const ts = Number(headers.timestamp)
  if (Math.abs(nowMs / 1000 - ts) > HMAC_TOLERANCE_SEC) return false
  const expected = Buffer.from(signBody(secret, ts, body), 'hex')
  const given = Buffer.from(headers.signature, 'hex')
  return expected.length === given.length && timingSafeEqual(expected, given)
}
