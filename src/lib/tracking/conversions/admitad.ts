/**
 * Admitad Statistics API (`GET /statistics/actions/`), OAuth2 kliens-azonosítóval (`client_credentials`, `statistics`
 * hatókör), lapozva (`limit`/`offset`). SubID: `subid`. Dátum: `dd.mm.yyyy` (OPEN_QUESTIONS #18).
 */
import { z } from 'zod'
import { parseClickId } from '../clickId'
import { pickFields, toDate, toHuf, type ConversionStatus, type NetworkConversionSource, type NormalizedConversion } from './types'

const Action = z.looseObject({
  action_id: z.union([z.number(), z.string()]),
  status: z.string(),
  cart: z.union([z.number(), z.string()]).nullish(),
  payment: z.union([z.number(), z.string()]).nullish(),
  currency: z.string().nullish(),
  action_date: z.string(),
  status_updated: z.string().nullish(),
  subid: z.string().nullish(),
  advcampaign_id: z.union([z.number(), z.string()]).nullish(),
})
const Payload = z.object({ results: z.array(z.unknown()), _meta: z.object({ count: z.number(), limit: z.number(), offset: z.number() }).nullish() })

const STATUS: Record<string, ConversionStatus> = { pending: 'pending', approved: 'approved', approved_but_stalled: 'approved', declined: 'rejected' }
const RAW_KEYS = ['action_id', 'status', 'cart', 'payment', 'currency', 'action_date', 'status_updated', 'subid', 'advcampaign_id'] as const

const dmy = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`

export const admitadConversions: NetworkConversionSource = {
  code: 'admitad',
  env: ['ADMITAD_CLIENT_ID', 'ADMITAD_CLIENT_SECRET'],
  async fetch(window, { env, fetchImpl }) {
    const basic = Buffer.from(`${env.ADMITAD_CLIENT_ID}:${env.ADMITAD_CLIENT_SECRET}`).toString('base64')
    const tok = await fetchImpl('https://api.admitad.com/token/', {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.ADMITAD_CLIENT_ID!, scope: 'statistics' }),
    })
    if (!tok.ok) throw new Error(`Admitad token: HTTP ${tok.status}`)
    const { access_token } = (await tok.json()) as { access_token?: string }
    if (!access_token) throw new Error('Admitad token: nincs access_token a válaszban.')
    const out: unknown[] = []
    for (let offset = 0; offset < 100_000; offset += 500) {
      const u = new URL('https://api.admitad.com/statistics/actions/')
      u.searchParams.set('date_start', dmy(window.from))
      u.searchParams.set('date_end', dmy(window.to))
      u.searchParams.set('limit', '500')
      u.searchParams.set('offset', String(offset))
      const res = await fetchImpl(u, { headers: { Authorization: `Bearer ${access_token}` } })
      if (!res.ok) throw new Error(`Admitad statisztika-API: HTTP ${res.status}`)
      const body = (await res.json()) as { results?: unknown[]; _meta?: { count?: number } }
      out.push(body)
      if (!body.results?.length || offset + 500 >= (body._meta?.count ?? 0)) break
    }
    return out
  },
  parse(payload) {
    const p = Payload.safeParse(payload)
    if (!p.success) return { items: [], rejected: 1 }
    const items: NormalizedConversion[] = []
    let rejected = 0
    for (const raw of p.data.results) {
      const a = Action.safeParse(raw)
      const status = a.success ? STATUS[a.data.status.toLowerCase()] : undefined
      const occurredAt = a.success ? toDate(a.data.action_date) : null
      if (!a.success || !status || !occurredAt) {
        rejected++
        continue
      }
      items.push({
        networkTransactionId: String(a.data.action_id),
        clickId: parseClickId(a.data.subid),
        programId: a.data.advcampaign_id == null ? null : String(a.data.advcampaign_id),
        orderValueHuf: toHuf(a.data.cart, a.data.currency ?? 'HUF'),
        commissionHuf: toHuf(a.data.payment, a.data.currency ?? 'HUF'),
        status,
        occurredAt,
        updatedAt: toDate(a.data.status_updated),
        raw: pickFields(a.data, RAW_KEYS),
      })
    }
    return { items, rejected }
  },
}
