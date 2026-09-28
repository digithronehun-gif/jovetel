/**
 * Awin Publisher API — tranzakciók (`GET /publishers/{publisherId}/transactions/`), Bearer tokennel, kérésenként
 * legfeljebb 31 napos ablakkal. SubID: `clickRefs.clickRef` (OPEN_QUESTIONS #5, #18: a jóváhagyott fiókon ellenőrizendő).
 */
import { z } from 'zod'
import { parseClickId } from '../clickId'
import { pickFields, splitWindow, toDate, toHuf, type ConversionStatus, type NetworkConversionSource, type NormalizedConversion } from './types'

const Money = z.object({ amount: z.union([z.number(), z.string()]).nullish(), currency: z.string().nullish() }).nullish()
const Tx = z.looseObject({
  id: z.union([z.number(), z.string()]),
  advertiserId: z.union([z.number(), z.string()]).nullish(),
  commissionStatus: z.string(),
  commissionAmount: Money,
  saleAmount: Money,
  clickRefs: z.looseObject({ clickRef: z.string().nullish() }).nullish(),
  transactionDate: z.string(),
  validationDate: z.string().nullish(),
})

const STATUS: Record<string, ConversionStatus> = { pending: 'pending', approved: 'approved', declined: 'rejected', deleted: 'rejected' }
const RAW_KEYS = ['id', 'advertiserId', 'commissionStatus', 'commissionAmount', 'saleAmount', 'clickRefs', 'transactionDate', 'validationDate', 'type', 'declineReason'] as const

const iso = (d: Date) => d.toISOString().slice(0, 19)

export const awinConversions: NetworkConversionSource = {
  code: 'awin',
  env: ['AWIN_API_TOKEN', 'AWIN_PUBLISHER_ID'],
  async fetch(window, { env, fetchImpl }) {
    const out: unknown[] = []
    for (const w of splitWindow(window, 31)) {
      const u = new URL(`https://api.awin.com/publishers/${encodeURIComponent(env.AWIN_PUBLISHER_ID!)}/transactions/`)
      u.searchParams.set('startDate', iso(w.from))
      u.searchParams.set('endDate', iso(w.to))
      u.searchParams.set('timezone', 'UTC')
      u.searchParams.set('dateType', 'transaction')
      const res = await fetchImpl(u, { headers: { Authorization: `Bearer ${env.AWIN_API_TOKEN}`, Accept: 'application/json' } })
      if (!res.ok) throw new Error(`Awin tranzakció-API: HTTP ${res.status}`)
      out.push(await res.json())
    }
    return out
  },
  parse(payload) {
    const list = Array.isArray(payload) ? payload : []
    const items: NormalizedConversion[] = []
    let rejected = 0
    for (const raw of list) {
      const t = Tx.safeParse(raw)
      const status = t.success ? STATUS[t.data.commissionStatus.toLowerCase()] : undefined
      const occurredAt = t.success ? toDate(t.data.transactionDate) : null
      if (!t.success || !status || !occurredAt) {
        rejected++
        continue
      }
      items.push({
        networkTransactionId: String(t.data.id),
        clickId: parseClickId(t.data.clickRefs?.clickRef),
        programId: t.data.advertiserId == null ? null : String(t.data.advertiserId),
        orderValueHuf: toHuf(t.data.saleAmount?.amount, t.data.saleAmount?.currency ?? 'HUF'),
        commissionHuf: toHuf(t.data.commissionAmount?.amount, t.data.commissionAmount?.currency ?? 'HUF'),
        status,
        occurredAt,
        updatedAt: toDate(t.data.validationDate),
        raw: pickFields(t.data, RAW_KEYS),
      })
    }
    return { items, rejected }
  },
}
