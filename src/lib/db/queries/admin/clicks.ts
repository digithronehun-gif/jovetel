/**
 * `/admin/kattintasok` (START_PROMPT F6): napi kattintás, bolt szerint, konverziók, jutalék, EPC. Csak admin
 * (4. vasszabály: a route `requireAdmin()`-ja mellett itt is `assertAdmin`). A botnak jelölt kattintás külön számol,
 * az EPC-be nem. A konverzió a vásárlás napjához tartozik (`occurred_at`), budapesti naptári nap szerint.
 */
import { getSqlAdmin } from '../../admin'
import { asDate, assertAdmin } from './common'

export const REPORT_RANGES = [7, 30, 90] as const
export type ReportRange = (typeof REPORT_RANGES)[number]

export interface DailyClicks {
  /** YYYY-MM-DD (Budapest) */
  day: string
  clicks: number
  botClicks: number
  conversions: number
  commissionHuf: number
}

export interface MerchantClicks {
  merchantId: string
  merchantName: string
  clicks: number
  conversions: number
  pendingHuf: number
  approvedHuf: number
  rejected: number
  /** (függő + jóváhagyott jutalék) / valódi kattintás, egész forintra kerekítve; kattintás nélkül null */
  epcHuf: number | null
}

export interface RecentConversion {
  id: string
  occurredAt: Date
  merchantName: string | null
  networkCode: string
  status: 'pending' | 'approved' | 'rejected'
  orderValueHuf: number | null
  commissionHuf: number | null
  hasClick: boolean
}

export interface ClickReport {
  days: ReportRange
  totals: { clicks: number; botClicks: number; conversions: number; pendingHuf: number; approvedHuf: number; epcHuf: number | null }
  daily: DailyClicks[]
  merchants: MerchantClicks[]
  placements: { placement: string | null; clicks: number }[]
  recent: RecentConversion[]
}

export async function clickReport(adminUserId: string, days: ReportRange, now: Date = new Date()): Promise<ClickReport> {
  await assertAdmin(adminUserId)
  const sql = getSqlAdmin()
  const nowIso = now.toISOString()
  // az ablak: a mai budapesti nappal együtt `days` nap
  const bounds = sql`
    select ((${nowIso}::timestamptz at time zone 'Europe/Budapest')::date - ${days - 1}::int) as d0,
      (${nowIso}::timestamptz at time zone 'Europe/Budapest')::date as d1`

  const daily = await sql<{ day: string; clicks: number; bot_clicks: number; conversions: number; commission_huf: number }[]>`
    with b as (${bounds}),
    d as (select generate_series(b.d0, b.d1, interval '1 day')::date as day from b),
    c as (
      select (c.created_at at time zone 'Europe/Budapest')::date as day,
        count(*) filter (where not c.is_bot)::int as clicks, count(*) filter (where c.is_bot)::int as bot_clicks
      from public.clicks c, b
      where c.created_at >= (b.d0::timestamp at time zone 'Europe/Budapest')
      group by 1
    ),
    v as (
      select (v.occurred_at at time zone 'Europe/Budapest')::date as day, count(*)::int as conversions,
        coalesce(sum(v.commission_huf) filter (where v.status <> 'rejected'), 0)::int as commission_huf
      from public.conversions v, b
      where v.occurred_at >= (b.d0::timestamp at time zone 'Europe/Budapest')
      group by 1
    )
    select to_char(d.day, 'YYYY-MM-DD') as day, coalesce(c.clicks, 0) as clicks, coalesce(c.bot_clicks, 0) as bot_clicks,
      coalesce(v.conversions, 0) as conversions, coalesce(v.commission_huf, 0) as commission_huf
    from d left join c on c.day = d.day left join v on v.day = d.day
    order by d.day`

  const merchants = await sql<
    { merchant_id: string; merchant_name: string; clicks: number; conversions: number; pending_huf: number; approved_huf: number; rejected: number }[]
  >`
    with b as (${bounds}),
    start as (select (b.d0::timestamp at time zone 'Europe/Budapest') as t from b),
    c as (
      select c.merchant_id, count(*)::int as clicks from public.clicks c, start
      where c.created_at >= start.t and not c.is_bot and c.merchant_id is not null group by 1
    ),
    v as (
      select v.merchant_id, count(*)::int as conversions,
        coalesce(sum(v.commission_huf) filter (where v.status = 'pending'), 0)::int as pending_huf,
        coalesce(sum(v.commission_huf) filter (where v.status = 'approved'), 0)::int as approved_huf,
        count(*) filter (where v.status = 'rejected')::int as rejected
      from public.conversions v, start
      where v.occurred_at >= start.t and v.merchant_id is not null group by 1
    )
    select m.id as merchant_id, m.name as merchant_name, coalesce(c.clicks, 0) as clicks, coalesce(v.conversions, 0) as conversions,
      coalesce(v.pending_huf, 0) as pending_huf, coalesce(v.approved_huf, 0) as approved_huf, coalesce(v.rejected, 0) as rejected
    from public.merchants m
    left join c on c.merchant_id = m.id
    left join v on v.merchant_id = m.id
    where c.clicks is not null or v.conversions is not null
    order by coalesce(c.clicks, 0) desc, m.name collate "hu-HU-x-icu"`

  const placements = await sql<{ placement: string | null; clicks: number }[]>`
    with b as (${bounds})
    select c.placement, count(*)::int as clicks from public.clicks c, b
    where c.created_at >= (b.d0::timestamp at time zone 'Europe/Budapest') and not c.is_bot
    group by 1 order by 2 desc, 1 nulls last`

  const recent = await sql<
    { id: string; occurred_at: unknown; merchant_name: string | null; network_code: string; status: RecentConversion['status']; order_value_huf: number | null; commission_huf: number | null; has_click: boolean }[]
  >`
    select v.id, v.occurred_at, m.name as merchant_name, n.code as network_code, v.status, v.order_value_huf, v.commission_huf,
      exists (select 1 from public.clicks c where c.click_id = v.click_id) as has_click
    from public.conversions v
    join public.networks n on n.id = v.network_id
    left join public.merchants m on m.id = v.merchant_id
    order by v.occurred_at desc, v.id
    limit 20`

  const epc = (commission: number, clicks: number) => (clicks > 0 ? Math.round(commission / clicks) : null)
  const merchantRows: MerchantClicks[] = merchants.map((m) => ({
    merchantId: m.merchant_id,
    merchantName: m.merchant_name,
    clicks: m.clicks,
    conversions: m.conversions,
    pendingHuf: m.pending_huf,
    approvedHuf: m.approved_huf,
    rejected: m.rejected,
    epcHuf: epc(m.pending_huf + m.approved_huf, m.clicks),
  }))
  const dailyRows = daily.map((d) => ({ day: d.day, clicks: d.clicks, botClicks: d.bot_clicks, conversions: d.conversions, commissionHuf: d.commission_huf }))
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
  const clicks = sum(dailyRows.map((d) => d.clicks))
  const pendingHuf = sum(merchantRows.map((m) => m.pendingHuf))
  const approvedHuf = sum(merchantRows.map((m) => m.approvedHuf))
  return {
    days,
    totals: {
      clicks,
      botClicks: sum(dailyRows.map((d) => d.botClicks)),
      conversions: sum(dailyRows.map((d) => d.conversions)),
      pendingHuf,
      approvedHuf,
      epcHuf: epc(sum(dailyRows.map((d) => d.commissionHuf)), clicks),
    },
    daily: dailyRows,
    merchants: merchantRows,
    placements,
    recent: recent.map((r) => ({
      id: r.id,
      occurredAt: asDate(r.occurred_at)!,
      merchantName: r.merchant_name,
      networkCode: r.network_code,
      status: r.status,
      orderValueHuf: r.order_value_huf,
      commissionHuf: r.commission_huf,
      hasClick: r.has_click,
    })),
  }
}
