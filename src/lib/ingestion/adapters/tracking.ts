/**
 * A kattintáskori cél-URL hálózatonként (ARCHITECTURE 4. pont, 3. lépés): a feed követő linkje (vagy a hálózat
 * deeplinkje) a hálózat subID-paraméterével, benne a `click_id`-val. Tiszta függvények, letöltő kód nélkül — így a
 * `/go` útvonal is importálhatja. A végső host ellenőrzése NEM itt, hanem a `lib/tracking/target.ts`-ben történik
 * (5. vasszabály): ami itt épül, az is csak engedélylistás hostra mehet ki.
 */
import type { MerchantRow } from '../types'

export interface TrackableOffer {
  /** a bolt termékoldala (a kereskedő domainjén) */
  url: string
  /** a feed által adott követő link (`offers.deeplink_template`), ha van */
  trackingUrl: string | null
}

export type TrackingMerchant = Pick<MerchantRow, 'programId' | 'subidParam' | 'subidMaxLen'>

export type TrackingBuilder = (
  offer: TrackableOffer,
  clickId: string,
  merchant: TrackingMerchant,
  feedConfig?: Record<string, unknown>,
) => string

/** A query-paraméter beállítása (felülírja, ha már van). */
export function withParam(url: string, key: string, value: string): string {
  const u = new URL(url)
  u.searchParams.set(key, value)
  return u.href
}

/** A subID a hálózat paraméternevével és hosszkorlátjával (a `networks` sorból; hiányában a hálózat alapértéke). */
export function subid(merchant: TrackingMerchant, clickId: string, fallbackParam: string): [string, string] {
  const param = merchant.subidParam || fallbackParam
  const value = merchant.subidMaxLen ? clickId.slice(0, merchant.subidMaxLen) : clickId
  return [param, value]
}

/** A hálózatok alapértelmezett subID-paramétere (OPEN_QUESTIONS #5: a `networks.subid_param` felülírja). */
export const DEFAULT_SUBID_PARAM: Record<string, string> = {
  awin: 'clickref',
  cj: 'sid',
  dognet: 'data1',
  admitad: 'subid',
  'generic-csv': 'subid',
  'generic-xml': 'subid',
  manual: 'subid',
}

/** A feed követő linkje subID-vel; ha a feed nem adott ilyet, a bolt URL-je (közvetlen partner, kézi felvitel). */
const trackingOrPlain =
  (code: string): TrackingBuilder =>
  (offer, clickId, merchant) => {
    const [p, v] = subid(merchant, clickId, DEFAULT_SUBID_PARAM[code]!)
    return withParam(offer.trackingUrl ?? offer.url, p, v)
  }

/** Csak a feed követő linkjéből (a hálózat deeplinkje nélkül nem építhető követett cél). */
const trackingOnly =
  (code: string, label: string): TrackingBuilder =>
  (offer, clickId, merchant) => {
    const [p, v] = subid(merchant, clickId, DEFAULT_SUBID_PARAM[code]!)
    if (!offer.trackingUrl) throw new Error(`${label}: a feed nem adott követő linket.`)
    return withParam(offer.trackingUrl, p, v)
  }

export const TRACKING_BUILDERS: Record<string, TrackingBuilder> = {
  awin: (offer, clickId, merchant) => {
    const [p, v] = subid(merchant, clickId, DEFAULT_SUBID_PARAM.awin!)
    if (offer.trackingUrl) return withParam(offer.trackingUrl, p, v)
    // TODO(owner): AWIN_PUBLISHER_ID és a program azonosítója (merchants.program_id) kell a deeplinkhez (OPEN_QUESTIONS #3)
    const affId = process.env.AWIN_PUBLISHER_ID
    if (!affId || !merchant.programId) throw new Error('Awin deeplink: hiányzik a publisher- vagy programazonosító.')
    const u = new URL('https://www.awin1.com/cread.php')
    u.searchParams.set('awinmid', merchant.programId)
    u.searchParams.set('awinaffid', affId)
    u.searchParams.set(p, v)
    u.searchParams.set('ued', offer.url)
    return u.href
  },
  cj: trackingOnly('cj', 'CJ'),
  admitad: trackingOnly('admitad', 'Admitad'),
  dognet: (offer, clickId, merchant, feedConfig) => {
    const [p, v] = subid(merchant, clickId, DEFAULT_SUBID_PARAM.dognet!)
    if (offer.trackingUrl) return withParam(offer.trackingUrl, p, v)
    // TODO(owner): a deeplink-sablon a jóváhagyott programnál derül ki (OPEN_QUESTIONS #15), pl.
    // `https://go.dognet.com/?chid=XXXX&url={url}` — a `{url}` helyére a bolt URL-je kerül, kódolva.
    const template = typeof feedConfig?.deeplinkTemplate === 'string' ? feedConfig.deeplinkTemplate : null
    if (!template || !template.includes('{url}')) throw new Error('Dognet: nincs deeplink-sablon (config.deeplinkTemplate).')
    return withParam(template.replace('{url}', encodeURIComponent(offer.url)), p, v)
  },
  'generic-csv': trackingOrPlain('generic-csv'),
  'generic-xml': trackingOrPlain('generic-xml'),
  manual: trackingOrPlain('manual'),
}

/** A hálózat kódja → az alapértelmezett adapter (ha az ajánlat nem feedből jött, pl. kézi felvitel vagy seed). */
const NETWORK_ADAPTER: Record<string, string> = { awin: 'awin', cj: 'cj', dognet: 'dognet', admitad: 'admitad' }

export function trackingBuilderFor(adapterCode: string | null | undefined, networkCode: string): TrackingBuilder {
  return (adapterCode && TRACKING_BUILDERS[adapterCode]) || TRACKING_BUILDERS[NETWORK_ADAPTER[networkCode] ?? 'manual']!
}
