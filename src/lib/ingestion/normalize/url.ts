/** URL-ellenőrzés a normalizáláskor (ARCHITECTURE 3.3): a bolt URL-je a kereskedő engedélylistáján legyen. */
import { isIP } from 'node:net'
import { hostAllowed } from '../fetch/ssrf'

export type UrlResult = { ok: true; url: string } | { ok: false; reason: 'invalid_url' | 'url_not_allowed' }

export const MAX_URL_LENGTH = 2048

export function checkUrl(raw: string | undefined | null, allowlist: readonly string[], opts: { httpsOnly?: boolean } = {}): UrlResult {
  if (!raw) return { ok: false, reason: 'invalid_url' }
  const s = raw.trim()
  if (s.length > MAX_URL_LENGTH) return { ok: false, reason: 'invalid_url' }
  let u: URL
  try {
    u = new URL(s)
  } catch {
    return { ok: false, reason: 'invalid_url' }
  }
  if (u.protocol !== 'https:' && (opts.httpsOnly || u.protocol !== 'http:')) return { ok: false, reason: 'invalid_url' }
  if (u.username || u.password) return { ok: false, reason: 'invalid_url' }
  const host = u.hostname.replace(/^\[|\]$/g, '')
  if (isIP(host)) return { ok: false, reason: 'url_not_allowed' }
  if (!hostAllowed(host, allowlist)) return { ok: false, reason: 'url_not_allowed' }
  u.hash = ''
  return { ok: true, url: u.href }
}

/** Termékkép: csak https, IP-literál nélkül; a host bármely nyilvános domain lehet (a bolt CDN-je). */
export function checkImageUrl(raw: string | undefined | null): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== 'https:' || u.username || u.password) return null
    if (isIP(u.hostname.replace(/^\[|\]$/g, ''))) return null
    if (u.href.length > MAX_URL_LENGTH) return null
    return u.href
  } catch {
    return null
  }
}
