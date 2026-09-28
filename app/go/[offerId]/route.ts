import { after, type NextRequest } from 'next/server'
import { CONSENT_COOKIE, parseConsent } from '@/lib/analytics/consent'
import { getSessionUser } from '@/lib/auth/session'
import { loadGoOffer, recordClick } from '@/lib/db/queries/tracking/clicks'
import { siteUrl } from '@/lib/env'
import { trackingBuilderFor } from '@/lib/ingestion/adapters/tracking'
import { clientIp, hashIdentifier } from '@/lib/security/ip'
import { rateLimit, RULES } from '@/lib/security/ratelimit'
import { isBotRequest } from '@/lib/tracking/bots'
import { newClickId } from '@/lib/tracking/clickId'
import { parsePlacement, parseRef } from '@/lib/tracking/placements'
import { checkRedirectTarget } from '@/lib/tracking/target'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const BASE_HEADERS = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Robots-Tag': 'noindex, nofollow',
}

function text(status: number, body: string, extra: Record<string, string> = {}): Response {
  return new Response(body, { status, headers: { ...BASE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...extra } })
}

/** 302 a megadott célra. Belső célnál relatív `Location` (soha nem a kérés Host fejlécéből építve). */
function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { ...BASE_HEADERS, Location: location } })
}

const isAuthCookie = (name: string) => name.startsWith('sb-') && name.includes('-auth-token')

/**
 * GET /go/{offerId} — követett átirányítás a boltba (ARCHITECTURE 4. pont, 5. vasszabály).
 * A cél KIZÁRÓLAG az adatbázisban tárolt ajánlatból épül; a query-paraméterek (`placement`, `ref`) csak naplózásra
 * valók, engedélylistával. A végső host a kereskedő `domain_allowlist`-jén vagy a hálózat tracking-domainjein kell
 * legyen, különben a termékoldalra irányítunk. A kattintás naplózása a válasz után fut (`after()`).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ offerId: string }> }): Promise<Response> {
  const { offerId } = await ctx.params
  if (!UUID_RE.test(offerId)) return text(404, 'Nincs ilyen ajánlat.')

  const ipHash = hashIdentifier(clientIp(req.headers))
  const limit = await rateLimit(RULES.go, ipHash)
  if (!limit.ok) {
    const retry = String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000)))
    return text(429, 'Túl sok kattintás rövid idő alatt. Próbáld újra egy perc múlva.', { 'Retry-After': retry })
  }

  const offer = await loadGoOffer(offerId)
  if (!offer) return text(404, 'Nincs ilyen ajánlat.')
  const productPage = `/termek/${encodeURIComponent(offer.productSlug)}`
  if (!offer.isActive || offer.merchantStatus !== 'active') return redirect(productPage)

  const clickId = newClickId()
  const allow = { merchantDomains: offer.merchantDomains, trackingDomains: offer.trackingDomains }
  let target: string | null = null
  try {
    const built = trackingBuilderFor(offer.adapter, offer.networkCode)(offer, clickId, offer, offer.feedConfig)
    const checked = checkRedirectTarget(built, allow)
    if (checked.ok) target = checked.url
    else console.error('A követett cél nem engedélyezett hostra mutat', { offerId, reason: checked.reason })
  } catch (e) {
    console.warn('Követett cél nem építhető, a bolt oldalára irányítunk jutalék nélkül', { offerId, error: (e as Error).message })
  }
  if (!target) {
    const plain = checkRedirectTarget(offer.url, { merchantDomains: offer.merchantDomains, trackingDomains: [] })
    if (plain.ok) target = plain.url
  }
  // soha ne vigyen vissza a saját oldalunkra (láncolt átirányítás ellen)
  if (target && new URL(target).host === new URL(siteUrl()).host) target = null
  if (!target) return redirect(productPage)

  const placement = parsePlacement(req.nextUrl.searchParams.get('placement'))
  const contentRef = parseRef(req.nextUrl.searchParams.get('ref'))
  const ua = req.headers.get('user-agent')
  const isBot = isBotRequest(req.headers)
  const hasAuthCookie = req.cookies.getAll().some((c) => isAuthCookie(c.name))
  const consent = parseConsent(req.cookies.get(CONSENT_COOKIE)?.value)
  const anon = req.cookies.get('jv_anon')?.value
  const sessionId = consent?.analytics && anon && /^[0-9a-f-]{36}$/.test(anon) ? anon : null

  // HEAD (linkelőnézet, ellenőrző eszközök): ugyanaz a válasz, de nem kattintás — nem naplózzuk
  if (req.method === 'HEAD') return redirect(target)
  after(async () => {
    const user = hasAuthCookie ? await getSessionUser().catch(() => null) : null
    await recordClick({
      clickId,
      offerId: offer.offerId,
      merchantId: offer.merchantId,
      userId: user?.id ?? null,
      sessionId,
      placement,
      contentRef,
      ipHash,
      uaHash: ua ? hashIdentifier(ua) : null,
      isBot,
    })
  })
  return redirect(target)
}
