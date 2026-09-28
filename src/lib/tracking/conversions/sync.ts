/**
 * Konverzió-szinkron (ARCHITECTURE 3. pont vége): hálózatonként az elmúlt 60 nap tranzakciói, upsert a
 * `conversions` táblába `(network_id, network_transaction_id)` szerint. A `click_id` a subID-ból jön; a kereskedő a
 * kattintásból, annak hiányában a hálózat program-azonosítójából (`merchants.program_id`) oldódik fel. Csak eltérésnél
 * ír (újrafuttatás = 0 írás). A `scripts/sync-conversions.ts` hívja (GitHub Actions, naponta 05:00).
 */
import type { Sql } from 'postgres'
import { admitadConversions } from './admitad'
import { awinConversions } from './awin'
import { cjConversions } from './cj'
import { dognetConversions } from './dognet'
import type { NetworkConversionSource, NormalizedConversion } from './types'

export const CONVERSION_SOURCES: Record<string, NetworkConversionSource> = {
  awin: awinConversions,
  cj: cjConversions,
  admitad: admitadConversions,
  dognet: dognetConversions,
}

export const SYNC_DAYS = 60

export interface SyncStats {
  network: string
  status: 'ok' | 'skipped' | 'failed'
  /** kihagyás / hiba oka (titok nélkül: csak a hiányzó változók NEVE) */
  reason?: string
  parsed: number
  rejected: number
  inserted: number
  updated: number
  unchanged: number
  /** ennyi tranzakció subID-je egyezett egy naplózott kattintással */
  withClick: number
  /** ennyihez sikerült kereskedőt rendelni (kattintásból vagy program-azonosítóból) */
  withMerchant: number
}

const empty = (network: string, status: SyncStats['status'], reason?: string): SyncStats => ({
  network,
  status,
  reason,
  parsed: 0,
  rejected: 0,
  inserted: 0,
  updated: 0,
  unchanged: 0,
  withClick: 0,
  withMerchant: 0,
})

/** Upsert egy hálózat tételeire (1000-es kötegekben). A kötegen belüli ismétlődő azonosítóból az utolsó marad. */
export async function upsertConversions(
  sql: Sql,
  networkId: string,
  items: NormalizedConversion[],
  now: Date,
): Promise<Pick<SyncStats, 'inserted' | 'updated' | 'unchanged' | 'withClick' | 'withMerchant'>> {
  const byId = new Map<string, NormalizedConversion>()
  for (const i of items) byId.set(i.networkTransactionId, i)
  const unique = [...byId.values()]
  const total = { inserted: 0, updated: 0, unchanged: 0, withClick: 0, withMerchant: 0 }
  for (let i = 0; i < unique.length; i += 1000) {
    const rows = unique.slice(i, i + 1000).map((c) => ({
      tx: c.networkTransactionId,
      click_id: c.clickId,
      program_id: c.programId,
      order_value_huf: c.orderValueHuf,
      commission_huf: c.commissionHuf,
      status: c.status,
      occurred_at: c.occurredAt.toISOString(),
      updated_at: c.updatedAt?.toISOString() ?? null,
      raw: c.raw,
    }))
    const [r] = await sql<{ inserted: number; updated: number; with_click: number; with_merchant: number }[]>`
      with input as (
        select * from jsonb_to_recordset(${JSON.stringify(rows)}::text::jsonb) as x(
          tx text, click_id text, program_id text, order_value_huf integer, commission_huf integer, status text,
          occurred_at timestamptz, updated_at timestamptz, raw jsonb)
      ), resolved as (
        select i.*, coalesce(c.merchant_id, pm.id) as merchant_id, c.click_id is not null as click_found
        from input i
        left join public.clicks c on c.click_id = i.click_id
        left join lateral (
          select m.id from public.merchants m
          where m.network_id = ${networkId}::uuid and i.program_id is not null and m.program_id = i.program_id
          order by m.created_at limit 1
        ) pm on true
      ), up as (
        insert into public.conversions as cv (network_id, network_transaction_id, click_id, merchant_id, order_value_huf,
          commission_huf, status, occurred_at, updated_from_network_at, raw)
        select ${networkId}::uuid, tx, click_id, merchant_id, order_value_huf, commission_huf, status, occurred_at,
          coalesce(updated_at, ${now.toISOString()}::timestamptz), coalesce(raw, '{}'::jsonb)
        from resolved
        on conflict (network_id, network_transaction_id) do update set
          click_id = excluded.click_id, merchant_id = excluded.merchant_id, order_value_huf = excluded.order_value_huf,
          commission_huf = excluded.commission_huf, status = excluded.status, occurred_at = excluded.occurred_at,
          updated_from_network_at = excluded.updated_from_network_at, raw = excluded.raw, updated_at = now()
        where (cv.click_id, cv.merchant_id, cv.order_value_huf, cv.commission_huf, cv.status, cv.occurred_at, cv.raw)
          is distinct from
          (excluded.click_id, excluded.merchant_id, excluded.order_value_huf, excluded.commission_huf, excluded.status,
           excluded.occurred_at, excluded.raw)
        returning (xmax = 0) as inserted
      )
      select (select count(*) from up where inserted)::int as inserted,
        (select count(*) from up where not inserted)::int as updated,
        (select count(*) from resolved where click_found)::int as with_click,
        (select count(*) from resolved where merchant_id is not null)::int as with_merchant`
    total.inserted += r!.inserted
    total.updated += r!.updated
    total.unchanged += rows.length - r!.inserted - r!.updated
    total.withClick += r!.with_click
    total.withMerchant += r!.with_merchant
  }
  return total
}

export interface SyncOptions {
  now?: Date
  days?: number
  /** csak ezek a hálózatok (kód) */
  only?: string[]
  env?: Record<string, string | undefined>
  fetchImpl?: typeof fetch
  /** fixture mód / teszt: a hálózat nyers válaszai (ilyenkor nincs API-hívás, kulcs sem kell) */
  payloads?: Record<string, unknown[]>
}

export async function syncConversions(sql: Sql, opts: SyncOptions = {}): Promise<SyncStats[]> {
  const now = opts.now ?? new Date()
  const env = opts.env ?? process.env
  const window = { from: new Date(now.getTime() - (opts.days ?? SYNC_DAYS) * 86_400_000), to: now }
  const codes = Object.keys(CONVERSION_SOURCES).filter((c) => !opts.only || opts.only.includes(c))
  const networks = new Map(
    (await sql<{ id: string; code: string }[]>`select id, code from public.networks where code = any(string_to_array(${codes.join(',')}::text, ','))`).map((n) => [n.code, n.id]),
  )
  const out: SyncStats[] = []
  for (const code of codes) {
    const source = CONVERSION_SOURCES[code]!
    const networkId = networks.get(code)
    if (!networkId) {
      out.push(empty(code, 'skipped', 'a hálózat nincs a networks táblában'))
      continue
    }
    const fixture = opts.payloads?.[code]
    if (opts.payloads && !fixture) {
      out.push(empty(code, 'skipped', 'nincs fixture'))
      continue
    }
    const missing = source.env.filter((k) => !env[k])
    if (!fixture && missing.length) {
      out.push(empty(code, 'skipped', `hiányzó beállítás: ${missing.join(', ')}`))
      continue
    }
    try {
      const payloads = fixture ?? (await source.fetch(window, { env, fetchImpl: opts.fetchImpl ?? fetch }))
      const stats = empty(code, 'ok')
      const items: NormalizedConversion[] = []
      for (const p of payloads) {
        const r = source.parse(p)
        items.push(...r.items)
        stats.rejected += r.rejected
      }
      stats.parsed = items.length
      Object.assign(stats, await upsertConversions(sql, networkId, items, now))
      out.push(stats)
    } catch (e) {
      out.push(empty(code, 'failed', (e as Error).message))
    }
  }
  return out
}
