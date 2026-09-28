/**
 * CJ Commission Detail API (GraphQL, `https://commissions.api.cj.com/query`), személyes hozzáférési tokennel,
 * kérésenként legfeljebb 31 napos ablakkal; `payloadComplete = false` esetén a `sinceCommissionId` lapoz.
 * SubID: a `sid` paraméter a jutalék-rekord `shopperId` mezőjében jön vissza. Az összegek a publisher-fiók
 * pénznemében (`…PubCurrency`); HUF-fiókot feltételezünk (OPEN_QUESTIONS #18).
 */
import { z } from 'zod'
import { parseClickId } from '../clickId'
import { pickFields, splitWindow, toDate, toHuf, type ConversionStatus, type NetworkConversionSource, type NormalizedConversion } from './types'

const Rec = z.looseObject({
  commissionId: z.union([z.string(), z.number()]),
  actionStatus: z.string(),
  advertiserId: z.union([z.string(), z.number()]).nullish(),
  eventDate: z.string(),
  postingDate: z.string().nullish(),
  saleAmountPubCurrency: z.union([z.string(), z.number()]).nullish(),
  pubCommissionAmountPubCurrency: z.union([z.string(), z.number()]).nullish(),
  shopperId: z.string().nullish(),
  correctionReason: z.string().nullish(),
})
const Payload = z.object({
  data: z.object({
    publisherCommissions: z.object({ payloadComplete: z.boolean().nullish(), records: z.array(z.unknown()) }),
  }),
})

const RAW_KEYS = ['commissionId', 'actionStatus', 'actionType', 'advertiserId', 'eventDate', 'postingDate', 'saleAmountPubCurrency', 'pubCommissionAmountPubCurrency', 'shopperId', 'correctionReason'] as const

function status(r: z.infer<typeof Rec>): ConversionStatus | undefined {
  const commission = Number(r.pubCommissionAmountPubCurrency ?? 0)
  if (r.correctionReason && commission <= 0) return 'rejected'
  // TODO(owner): a CJ-státuszok (new, extended, locked, closed) jelentése a fiókon ellenőrizendő (OPEN_QUESTIONS #18)
  return ({ new: 'pending', extended: 'pending', locked: 'approved', closed: 'approved' } as Record<string, ConversionStatus>)[r.actionStatus.toLowerCase()]
}

const QUERY = `query ($pub: [String!]!, $since: String!, $before: String!, $sinceId: String) {
  publisherCommissions(forPublishers: $pub, sincePostingDate: $since, beforePostingDate: $before, sinceCommissionId: $sinceId) {
    count payloadComplete maxCommissionId
    records { commissionId actionStatus actionType advertiserId eventDate postingDate saleAmountPubCurrency pubCommissionAmountPubCurrency shopperId correctionReason }
  }
}`

export const cjConversions: NetworkConversionSource = {
  code: 'cj',
  env: ['CJ_API_TOKEN', 'CJ_PUBLISHER_ID'],
  async fetch(window, { env, fetchImpl }) {
    const out: unknown[] = []
    for (const w of splitWindow(window, 31)) {
      let sinceId: string | null = null
      for (let page = 0; page < 50; page++) {
        const res = await fetchImpl('https://commissions.api.cj.com/query', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.CJ_API_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: QUERY, variables: { pub: [env.CJ_PUBLISHER_ID], since: w.from.toISOString(), before: w.to.toISOString(), sinceId } }),
        })
        if (!res.ok) throw new Error(`CJ jutalék-API: HTTP ${res.status}`)
        const body = (await res.json()) as { data?: { publisherCommissions?: { payloadComplete?: boolean; maxCommissionId?: string } } }
        out.push(body)
        const pc = body.data?.publisherCommissions
        if (!pc || pc.payloadComplete !== false || !pc.maxCommissionId) break
        sinceId = pc.maxCommissionId
      }
    }
    return out
  },
  parse(payload) {
    const p = Payload.safeParse(payload)
    if (!p.success) return { items: [], rejected: 1 }
    const items: NormalizedConversion[] = []
    let rejected = 0
    for (const raw of p.data.data.publisherCommissions.records) {
      const r = Rec.safeParse(raw)
      const st = r.success ? status(r.data) : undefined
      const occurredAt = r.success ? toDate(r.data.eventDate) : null
      if (!r.success || !st || !occurredAt) {
        rejected++
        continue
      }
      items.push({
        networkTransactionId: String(r.data.commissionId),
        clickId: parseClickId(r.data.shopperId),
        programId: r.data.advertiserId == null ? null : String(r.data.advertiserId),
        orderValueHuf: toHuf(r.data.saleAmountPubCurrency, 'HUF'),
        commissionHuf: toHuf(r.data.pubCommissionAmountPubCurrency, 'HUF'),
        status: st,
        occurredAt,
        updatedAt: toDate(r.data.postingDate),
        raw: pickFields(r.data, RAW_KEYS),
      })
    }
    return { items, rejected }
  },
}
