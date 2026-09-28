/**
 * Kattintáskövetés (ARCHITECTURE 4. pont, DATA_MODEL 4. pont). A `/go` egyetlen lekérdezéssel tölti be az ajánlatot, a
 * kereskedőt, a hálózatot és a feed adapterét; a cél-URL KIZÁRÓLAG ebből épül (5. vasszabály).
 * A kattintásnapló a felhasználóhoz köthető adat (`user_id`): csak a hívó által átadott, szerveroldalon ellenőrzött
 * `userId` kerülhet bele; IP és user-agent csak sózott hash-ként (CLAUDE.md 10. pont).
 */
import { getSql } from '../../client'

export interface GoOffer {
  offerId: string
  productSlug: string
  url: string
  trackingUrl: string | null
  isActive: boolean
  merchantId: string
  merchantStatus: 'pending' | 'active' | 'paused' | 'rejected'
  programId: string | null
  merchantDomains: string[]
  networkCode: string
  subidParam: string | null
  subidMaxLen: number | null
  trackingDomains: string[]
  adapter: string | null
  feedConfig: Record<string, unknown>
}

export async function loadGoOffer(offerId: string): Promise<GoOffer | null> {
  const sql = getSql()
  const [r] = await sql<
    {
      offer_id: string
      product_slug: string
      url: string
      deeplink_template: string | null
      is_active: boolean
      merchant_id: string
      merchant_status: GoOffer['merchantStatus']
      program_id: string | null
      domain_allowlist: string[]
      network_code: string
      subid_param: string | null
      subid_max_len: number | null
      tracking_domains: string[]
      adapter: string | null
      config: Record<string, unknown> | string | null
    }[]
  >`
    select o.id as offer_id, p.slug as product_slug, o.url, o.deeplink_template, o.is_active,
      m.id as merchant_id, m.status as merchant_status, m.program_id, m.domain_allowlist,
      n.code as network_code, n.subid_param, n.subid_max_len, n.tracking_domains,
      f.adapter, f.config
    from public.offers o
    join public.products p on p.id = o.product_id
    join public.merchants m on m.id = o.merchant_id
    join public.networks n on n.id = m.network_id
    left join public.source_items si on si.id = o.source_item_id
    left join public.feeds f on f.id = si.feed_id
    where o.id = ${offerId}::uuid`
  if (!r) return null
  const config = typeof r.config === 'string' ? (JSON.parse(r.config) as Record<string, unknown>) : (r.config ?? {})
  return {
    offerId: r.offer_id,
    productSlug: r.product_slug,
    url: r.url,
    trackingUrl: r.deeplink_template,
    isActive: r.is_active,
    merchantId: r.merchant_id,
    merchantStatus: r.merchant_status,
    programId: r.program_id,
    merchantDomains: r.domain_allowlist ?? [],
    networkCode: r.network_code,
    subidParam: r.subid_param,
    subidMaxLen: r.subid_max_len,
    trackingDomains: r.tracking_domains ?? [],
    adapter: r.adapter,
    feedConfig: config,
  }
}

export interface ClickRecord {
  clickId: string
  offerId: string
  merchantId: string
  /** csak szerveroldalon ellenőrzött session-ből (4. vasszabály) */
  userId: string | null
  /** névtelen munkamenet-azonosító, csak analitikai hozzájárulással */
  sessionId: string | null
  placement: string | null
  contentRef: string | null
  ipHash: string
  uaHash: string | null
  isBot: boolean
}

/** Kattintás naplózása (a `/go` az `after()`-ben hívja, a válasz után). Hibánál nem dob: a látogató már a boltban van. */
export async function recordClick(c: ClickRecord): Promise<boolean> {
  try {
    const sql = getSql()
    const r = await sql`
      insert into public.clicks (click_id, offer_id, merchant_id, user_id, session_id, placement, content_ref, ip_hash, ua_hash, is_bot)
      values (${c.clickId}, ${c.offerId}::uuid, ${c.merchantId}::uuid, ${c.userId}::uuid, ${c.sessionId}, ${c.placement},
        ${c.contentRef}, ${c.ipHash}, ${c.uaHash}, ${c.isBot})
      on conflict (click_id) do nothing`
    return r.count === 1
  } catch (e) {
    console.error('Kattintásnapló sikertelen', (e as Error).message)
    return false
  }
}
