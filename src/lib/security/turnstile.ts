/**
 * Cloudflare Turnstile szerveroldali ellenőrzése. Kulcs nélkül fejlesztésben és tesztben átenged
 * (jól látható figyelmeztetéssel); production-ben kulcs nélkül ELUTASÍT (zárt hibamód).
 */
import { isProductionDeployment } from '../env'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export type TurnstileResult = { ok: true; skipped?: boolean } | { ok: false; reason: string }

export async function verifyTurnstile(token: string | null | undefined, ip?: string): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    if (isProductionDeployment()) return { ok: false, reason: 'A bot-védelem nincs beállítva.' }
    return { ok: true, skipped: true }
  }
  if (!token) return { ok: false, reason: 'Hiányzik a bot-ellenőrzés.' }
  const body = new URLSearchParams({ secret, response: token })
  if (ip) body.set('remoteip', ip)
  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(5000) })
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
    return data.success ? { ok: true } : { ok: false, reason: (data['error-codes'] ?? ['ismeretlen']).join(',') }
  } catch {
    return { ok: false, reason: 'A bot-ellenőrzés most nem érhető el.' }
  }
}
