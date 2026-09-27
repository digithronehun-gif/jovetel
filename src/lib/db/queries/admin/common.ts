/**
 * Az admin lekérdezések közös része (4. vasszabály, második réteg): minden admin függvény megkapja az admin
 * `userId`-ját, és a lekérdezés maga is ellenőrzi a szerepkört — a route-szintű `requireAdmin()` mellett.
 * Minden admin írás az `audit_log`-ba kerül (`recordAdminAction`).
 */
import { getSqlAdmin } from '../../admin'

export class ForbiddenError extends Error {
  constructor() {
    super('Nincs jogosultság.')
    this.name = 'ForbiddenError'
  }
}

/** A közös kliensen a Drizzle a dátumokat szövegként adja vissza: itt egységesen Date-re alakítjuk. */
export const asDate = (v: unknown): Date | null => (v == null ? null : v instanceof Date ? v : new Date(String(v)))

export async function assertAdmin(adminUserId: string): Promise<void> {
  const sql = getSqlAdmin()
  const [row] = await sql<{ ok: boolean }[]>`
    select exists (select 1 from public.profiles where user_id = ${adminUserId} and role = 'admin') as ok`
  if (!row?.ok) throw new ForbiddenError()
}

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
    values (${adminUserId}, ${action}, ${entity}, ${entityId}, ${JSON.stringify(diff)}::text::jsonb)`
}
