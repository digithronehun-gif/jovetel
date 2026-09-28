/**
 * Dognet (Post Affiliate Pro alapú hálózat) — TODO(owner): a tranzakció-export pontos címe, hitelesítése és mezőnevei a
 * jóváhagyott fióknál derülnek ki (OPEN_QUESTIONS #19). Addig a PAP-exportok szokásos mezőit várjuk: `id`,
 * `status` (A = jóváhagyott, P = függő, D = elutasított), `totalcost`, `commission`, `dateinserted`, `dateapproved`,
 * `data1` (a subID) és `campaignid`. A cím a `DOGNET_CONVERSIONS_URL` (csak https), a kulcs a `DOGNET_API_KEY`.
 */
import { z } from 'zod'
import { parseClickId } from '../clickId'
import { pickFields, toDate, toHuf, type ConversionStatus, type NetworkConversionSource, type NormalizedConversion } from './types'

const Tx = z.looseObject({
  id: z.union([z.string(), z.number()]),
  status: z.string(),
  totalcost: z.union([z.string(), z.number()]).nullish(),
  commission: z.union([z.string(), z.number()]).nullish(),
  currency: z.string().nullish(),
  dateinserted: z.string(),
  dateapproved: z.string().nullish(),
  data1: z.string().nullish(),
  campaignid: z.union([z.string(), z.number()]).nullish(),
})
const STATUS: Record<string, ConversionStatus> = { a: 'approved', p: 'pending', d: 'rejected' }
const RAW_KEYS = ['id', 'status', 'totalcost', 'commission', 'currency', 'dateinserted', 'dateapproved', 'data1', 'campaignid'] as const

export const dognetConversions: NetworkConversionSource = {
  code: 'dognet',
  env: ['DOGNET_CONVERSIONS_URL', 'DOGNET_API_KEY'],
  async fetch(window, { env, fetchImpl }) {
    const u = new URL(env.DOGNET_CONVERSIONS_URL!)
    if (u.protocol !== 'https:') throw new Error('DOGNET_CONVERSIONS_URL: csak https.')
    u.searchParams.set('date_from', window.from.toISOString().slice(0, 10))
    u.searchParams.set('date_to', window.to.toISOString().slice(0, 10))
    const res = await fetchImpl(u, { headers: { Authorization: `Bearer ${env.DOGNET_API_KEY}`, Accept: 'application/json' } })
    if (!res.ok) throw new Error(`Dognet tranzakció-export: HTTP ${res.status}`)
    return [await res.json()]
  },
  parse(payload) {
    const list = Array.isArray(payload) ? payload : Array.isArray((payload as { rows?: unknown })?.rows) ? (payload as { rows: unknown[] }).rows : []
    const items: NormalizedConversion[] = []
    let rejected = 0
    for (const raw of list) {
      const t = Tx.safeParse(raw)
      const status = t.success ? STATUS[t.data.status.trim().toLowerCase()] : undefined
      const occurredAt = t.success ? toDate(t.data.dateinserted) : null
      if (!t.success || !status || !occurredAt) {
        rejected++
        continue
      }
      items.push({
        networkTransactionId: String(t.data.id),
        clickId: parseClickId(t.data.data1),
        programId: t.data.campaignid == null ? null : String(t.data.campaignid),
        orderValueHuf: toHuf(t.data.totalcost, t.data.currency ?? 'HUF'),
        commissionHuf: toHuf(t.data.commission, t.data.currency ?? 'HUF'),
        status,
        occurredAt,
        updatedAt: toDate(t.data.dateapproved),
        raw: pickFields(t.data, RAW_KEYS),
      })
    }
    return { items, rejected }
  },
}
