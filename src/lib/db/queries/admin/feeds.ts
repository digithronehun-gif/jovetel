/**
 * Az admin felület feed-lekérdezései (4. vasszabály, második réteg): minden függvény megkapja az admin
 * `userId`-ját, és a lekérdezés maga is ellenőrzi, hogy admin-e — a route-szintű `requireAdmin()` mellett.
 * Minden admin írás az `audit_log`-ba kerül.
 */
import { getSqlAdmin } from '../../admin'

export class ForbiddenError extends Error {
  constructor() {
    super('Nincs jogosultság.')
    this.name = 'ForbiddenError'
  }
}

/** A közös kliensen a Drizzle a dátumokat szövegként adja vissza: itt egységesen Date-re alakítjuk. */
const asDate = (v: unknown): Date | null => (v == null ? null : v instanceof Date ? v : new Date(String(v)))

async function assertAdmin(adminUserId: string): Promise<void> {
  const sql = getSqlAdmin()
  const [row] = await sql<{ ok: boolean }[]>`
    select exists (select 1 from public.profiles where user_id = ${adminUserId} and role = 'admin') as ok`
  if (!row?.ok) throw new ForbiddenError()
}

export interface AdminFeedRow {
  id: string
  merchantName: string
  merchantSlug: string
  merchantStatus: string
  networkCode: string
  adapter: string
  format: string
  isActive: boolean
  lastSuccessAt: Date | null
  lastItemCount: number | null
  lastRunStatus: string | null
  lastRunAt: Date | null
  lastRunRejected: number | null
  lastRunSeen: number | null
  blockedReason: string | null
  activeOffers: number
}

export async function listFeedsForAdmin(adminUserId: string): Promise<AdminFeedRow[]> {
  await assertAdmin(adminUserId)
  const sql = getSqlAdmin()
  const rows = await sql<AdminFeedRow[]>`
    select f.id, m.name as "merchantName", m.slug as "merchantSlug", m.status as "merchantStatus", n.code as "networkCode",
      f.adapter, f.format, f.is_active as "isActive", f.last_success_at as "lastSuccessAt", f.last_item_count as "lastItemCount",
      r.status as "lastRunStatus", r.started_at as "lastRunAt", r.items_rejected as "lastRunRejected", r.items_seen as "lastRunSeen",
      r.blocked_reason as "blockedReason",
      (select count(*)::int from public.offers o join public.source_items s on s.id = o.source_item_id
        where s.feed_id = f.id and o.is_active) as "activeOffers"
    from public.feeds f
    join public.merchants m on m.id = f.merchant_id
    join public.networks n on n.id = m.network_id
    left join lateral (select * from public.feed_runs where feed_id = f.id order by started_at desc limit 1) r on true
    where exists (select 1 from public.profiles where user_id = ${adminUserId} and role = 'admin')
    order by m.name`
  return rows.map((r) => ({ ...r, lastSuccessAt: asDate(r.lastSuccessAt), lastRunAt: asDate(r.lastRunAt) }))
}

export interface AdminRunRow {
  id: string
  startedAt: Date
  finishedAt: Date | null
  status: string
  itemsSeen: number
  itemsValid: number
  itemsChanged: number
  itemsRejected: number
  errorSample: { reason: string; field?: string; sku?: string; detail?: string }[]
  blockedReason: string | null
  rawObjectPath: string | null
  stats: Record<string, unknown>
}

export async function getFeedDetailForAdmin(adminUserId: string, feedId: string) {
  await assertAdmin(adminUserId)
  const sql = getSqlAdmin()
  const [feed] = await sql<(AdminFeedRow & { url: string | null; config: Record<string, unknown> })[]>`
    select f.id, m.name as "merchantName", m.slug as "merchantSlug", m.status as "merchantStatus", n.code as "networkCode",
      f.adapter, f.format, f.is_active as "isActive", f.last_success_at as "lastSuccessAt", f.last_item_count as "lastItemCount",
      f.url, f.config
    from public.feeds f join public.merchants m on m.id = f.merchant_id join public.networks n on n.id = m.network_id
    where f.id = ${feedId} and exists (select 1 from public.profiles where user_id = ${adminUserId} and role = 'admin')`
  if (!feed) return null
  feed.lastSuccessAt = asDate(feed.lastSuccessAt)
  const runs = await sql<AdminRunRow[]>`
    select id, started_at as "startedAt", finished_at as "finishedAt", status, items_seen as "itemsSeen",
      items_valid as "itemsValid", items_changed as "itemsChanged", items_rejected as "itemsRejected",
      error_sample as "errorSample", blocked_reason as "blockedReason", raw_object_path as "rawObjectPath", stats
    from public.feed_runs where feed_id = ${feedId} order by started_at desc limit 20`
  return { feed, runs: runs.map((r) => ({ ...r, startedAt: asDate(r.startedAt)!, finishedAt: asDate(r.finishedAt) })) }
}

/** Admin-művelet naplózása (CLAUDE.md 11. pont). */
export async function recordAdminAction(
  adminUserId: string,
  action: string,
  entity: string,
  entityId: string | null,
  diff: Record<string, unknown> = {},
): Promise<void> {
  await assertAdmin(adminUserId)
  const sql = getSqlAdmin()
  await sql`
    insert into public.audit_log (actor_user_id, action, entity, entity_id, diff)
    values (${adminUserId}, ${action}, ${entity}, ${entityId}, ${sql.json(diff as never)})`
}

export async function feedExistsForAdmin(adminUserId: string, feedId: string): Promise<boolean> {
  await assertAdmin(adminUserId)
  const sql = getSqlAdmin()
  const [r] = await sql<{ ok: boolean }[]>`select exists (select 1 from public.feeds where id = ${feedId}) as ok`
  return Boolean(r?.ok)
}
