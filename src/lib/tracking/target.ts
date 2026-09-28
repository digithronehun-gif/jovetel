/**
 * A `/go` végső céljának ellenőrzése (5. vasszabály): csak az adatbázisban tárolt ajánlatból épített URL, és annak
 * hostja a kereskedő `domain_allowlist`-jén vagy a hálózat tracking-domainjein van. Paraméterből érkező cél nincs.
 */
import { checkUrl } from '../ingestion/normalize/url'

export interface TargetAllowlist {
  merchantDomains: readonly string[]
  trackingDomains: readonly string[]
}

export type TargetCheck = { ok: true; url: string } | { ok: false; reason: 'invalid_url' | 'url_not_allowed' }

export function checkRedirectTarget(url: string, allow: TargetAllowlist): TargetCheck {
  // a hálózati követő link csak https lehet; a bolt saját oldala http is (a feed így adta, az importkor is ellenőriztük)
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return { ok: false, reason: 'invalid_url' }
  }
  const tracking = checkUrl(url, allow.trackingDomains, { httpsOnly: true })
  if (tracking.ok) return tracking
  const merchant = checkUrl(url, allow.merchantDomains)
  if (merchant.ok) return merchant
  return { ok: false, reason: host ? merchant.reason : 'invalid_url' }
}
