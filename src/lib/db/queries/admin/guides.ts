/**
 * Az útmutató-szerkesztő lekérdezései (PRODUCT_SPEC 9–10.). Minden függvény az admin `userId`-jával indul, és a
 * szerepkört a lekérdezés is ellenőrzi (`assertAdmin`); minden írás az `audit_log`-ba kerül. A szerkesztői szöveg
 * csak szövegként kerül a DB-be és a felületre (markup soha).
 */
import { guideIndexability } from '../../../content/guides'
import { getSqlAdmin } from '../../admin'
import { asDate, assertAdmin, recordAdminAction } from './common'

export interface AdminGuideRow {
  id: string
  slug: string | null
  title: string
  published: boolean
  publishedAt: Date | null
  itemCount: number
  isIndexable: boolean
  updatedAt: Date
}

export interface AdminGuideDetail {
  id: string
  slug: string | null
  title: string
  intro: string | null
  coverSlot: string | null
  published: boolean
  publishedAt: Date | null
  isIndexable: boolean
  items: { id: string; productId: string; productName: string; productSlug: string; brandName: string | null; note: string | null; position: number }[]
}

export class GuideSlugTakenError extends Error {
  constructor() {
    super('Ez az URL-név már foglalt.')
    this.name = 'GuideSlugTakenError'
  }
}

export async function listGuidesForAdmin(adminUserId: string): Promise<AdminGuideRow[]> {
  await assertAdmin(adminUserId)
  const sql = getSqlAdmin()
  const rows = await sql<
    { id: string; slug: string | null; title: string; visibility: string; published_at: unknown; item_count: number; is_indexable: boolean; updated_at: unknown }[]
  >`
    select l.id, l.slug, l.title, l.visibility, l.published_at, l.is_indexable, l.updated_at,
      (select count(*)::int from public.list_items i where i.list_id = l.id) as item_count
    from public.lists l where l.type = 'editorial'
    order by l.updated_at desc`
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    published: r.visibility === 'public' && r.published_at != null,
    publishedAt: asDate(r.published_at),
    itemCount: r.item_count,
    isIndexable: r.is_indexable,
    updatedAt: asDate(r.updated_at)!,
  }))
}

export async function getGuideForAdmin(adminUserId: string, guideId: string): Promise<AdminGuideDetail | null> {
  await assertAdmin(adminUserId)
  const sql = getSqlAdmin()
  const [l] = await sql<
    { id: string; slug: string | null; title: string; intro: string | null; cover_slot: string | null; visibility: string; published_at: unknown; is_indexable: boolean }[]
  >`select id, slug, title, intro, cover_slot, visibility, published_at, is_indexable from public.lists where id = ${guideId} and type = 'editorial'`
  if (!l) return null
  const items = await sql<
    { id: string; product_id: string; name: string; slug: string; brand_name: string | null; note: string | null; position: number }[]
  >`
    select i.id, i.product_id, p.name, p.slug, p.brand_name, i.note, i.position
    from public.list_items i join public.products p on p.id = i.product_id
    where i.list_id = ${guideId} order by i.position, i.created_at`
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    intro: l.intro,
    coverSlot: l.cover_slot,
    published: l.visibility === 'public' && l.published_at != null,
    publishedAt: asDate(l.published_at),
    isIndexable: l.is_indexable,
    items: items.map((i) => ({
      id: i.id,
      productId: i.product_id,
      productName: i.name,
      productSlug: i.slug,
      brandName: i.brand_name,
      note: i.note,
      position: i.position,
    })),
  }
}

/** Az indexelhetőség (≥ 5 tétel, ≥ 150 szó, nincs helyőrző) a mentett állapotból újraszámolva. */
async function syncIndexable(guideId: string): Promise<void> {
  const sql = getSqlAdmin()
  const [l] = await sql<{ intro: string | null }[]>`select intro from public.lists where id = ${guideId}`
  const notes = await sql<{ note: string | null }[]>`select note from public.list_items where list_id = ${guideId}`
  const { indexable } = guideIndexability({ intro: l?.intro ?? null, notes: notes.map((n) => n.note) })
  await sql`update public.lists set is_indexable = ${indexable} where id = ${guideId} and is_indexable is distinct from ${indexable}`
}

async function slugTaken(slug: string, exceptId: string | null): Promise<boolean> {
  const sql = getSqlAdmin()
  const [r] = await sql<{ n: number }[]>`
    select count(*)::int as n from public.lists
    where type in ('editorial', 'creator') and slug = ${slug} and (${exceptId}::uuid is null or id <> ${exceptId}::uuid)`
  return (r?.n ?? 0) > 0
}

export async function createGuide(adminUserId: string, input: { title: string; slug: string }): Promise<string> {
  await assertAdmin(adminUserId)
  if (await slugTaken(input.slug, null)) throw new GuideSlugTakenError()
  const sql = getSqlAdmin()
  const [row] = await sql<{ id: string }[]>`
    insert into public.lists (owner_id, type, title, slug, visibility, cover_slot)
    values (${adminUserId}, 'editorial', ${input.title}, ${input.slug}, 'private', 'utmutato.boritokep')
    returning id`
  await recordAdminAction(adminUserId, 'guide.create', 'list', row!.id, { title: input.title, slug: input.slug })
  return row!.id
}

export async function updateGuide(
  adminUserId: string,
  guideId: string,
  input: { title: string; slug: string; intro: string | null; coverSlot: string | null },
): Promise<void> {
  await assertAdmin(adminUserId)
  if (await slugTaken(input.slug, guideId)) throw new GuideSlugTakenError()
  const sql = getSqlAdmin()
  await sql`
    update public.lists set title = ${input.title}, slug = ${input.slug}, intro = ${input.intro}, cover_slot = ${input.coverSlot}
    where id = ${guideId} and type = 'editorial'`
  await syncIndexable(guideId)
  await recordAdminAction(adminUserId, 'guide.update', 'list', guideId, { title: input.title, slug: input.slug, coverSlot: input.coverSlot })
}

export async function setGuidePublished(adminUserId: string, guideId: string, published: boolean): Promise<void> {
  await assertAdmin(adminUserId)
  const sql = getSqlAdmin()
  if (published) {
    await sql`update public.lists set visibility = 'public', published_at = coalesce(published_at, now())
      where id = ${guideId} and type = 'editorial' and slug is not null`
  } else {
    await sql`update public.lists set visibility = 'private', published_at = null where id = ${guideId} and type = 'editorial'`
  }
  await recordAdminAction(adminUserId, published ? 'guide.publish' : 'guide.unpublish', 'list', guideId)
}

export async function deleteGuide(adminUserId: string, guideId: string): Promise<void> {
  await assertAdmin(adminUserId)
  const sql = getSqlAdmin()
  await sql`delete from public.lists where id = ${guideId} and type = 'editorial'`
  await recordAdminAction(adminUserId, 'guide.delete', 'list', guideId)
}

export async function addGuideItem(adminUserId: string, guideId: string, productId: string): Promise<void> {
  await assertAdmin(adminUserId)
  const sql = getSqlAdmin()
  await sql`
    insert into public.list_items (list_id, product_id, position)
    select ${guideId}, ${productId}, coalesce(max(position) + 1, 0) from public.list_items where list_id = ${guideId}
    on conflict (list_id, product_id) do nothing`
  await syncIndexable(guideId)
  await recordAdminAction(adminUserId, 'guide.item_add', 'list', guideId, { productId })
}

export async function updateGuideItemNote(adminUserId: string, guideId: string, itemId: string, note: string | null): Promise<void> {
  await assertAdmin(adminUserId)
  const sql = getSqlAdmin()
  await sql`update public.list_items set note = ${note} where id = ${itemId} and list_id = ${guideId}`
  await syncIndexable(guideId)
  await recordAdminAction(adminUserId, 'guide.item_note', 'list', guideId, { itemId })
}

export async function moveGuideItem(adminUserId: string, guideId: string, itemId: string, direction: 'up' | 'down'): Promise<void> {
  await assertAdmin(adminUserId)
  const sql = getSqlAdmin()
  await sql.begin(async (tx) => {
    const items = await tx<{ id: string }[]>`select id from public.list_items where list_id = ${guideId} order by position, created_at for update`
    const i = items.findIndex((x) => x.id === itemId)
    const j = direction === 'up' ? i - 1 : i + 1
    if (i < 0 || j < 0 || j >= items.length) return
    const order = items.map((x) => x.id)
    ;[order[i], order[j]] = [order[j]!, order[i]!]
    for (const [pos, id] of order.entries()) await tx`update public.list_items set position = ${pos} where id = ${id}`
  })
  await recordAdminAction(adminUserId, 'guide.item_move', 'list', guideId, { itemId, direction })
}

export async function removeGuideItem(adminUserId: string, guideId: string, itemId: string): Promise<void> {
  await assertAdmin(adminUserId)
  const sql = getSqlAdmin()
  await sql`delete from public.list_items where id = ${itemId} and list_id = ${guideId}`
  await syncIndexable(guideId)
  await recordAdminAction(adminUserId, 'guide.item_remove', 'list', guideId, { itemId })
}

/** Termékkereső a szerkesztőhöz (a keresés egyezéshalmazából, a 10 legrelevánsabb). */
export async function searchProductsForAdmin(adminUserId: string, q: string): Promise<{ id: string; name: string; brandName: string | null; slug: string }[]> {
  await assertAdmin(adminUserId)
  if (q.trim().length < 2) return []
  const sql = getSqlAdmin()
  return sql<{ id: string; name: string; brandName: string | null; slug: string }[]>`
    select p.id, p.name, p.brand_name as "brandName", p.slug
    from public.search_match(${q}) m join public.products p on p.id = m.product_id
    order by m.relevance desc, p.name limit 10`
}

export async function guideExistsForAdmin(adminUserId: string, guideId: string): Promise<boolean> {
  await assertAdmin(adminUserId)
  const sql = getSqlAdmin()
  const [r] = await sql<{ ok: boolean }[]>`select exists (select 1 from public.lists where id = ${guideId} and type = 'editorial') as ok`
  return !!r?.ok
}
