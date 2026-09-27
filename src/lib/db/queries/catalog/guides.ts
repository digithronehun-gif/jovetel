import { getSql } from '../../client'

/**
 * Szerkesztői útmutatók (lists.type = 'editorial', PRODUCT_SPEC 9.) — csak a közzétett, nyilvános útmutatók.
 * Nem felhasználói adat: a szerkesztőség listái (a gazda az admin profilja).
 */
export interface GuideSummary {
  id: string
  slug: string
  title: string
  intro: string | null
  coverSlot: string | null
  publishedAt: Date
  itemCount: number
}

export interface GuideDetail extends GuideSummary {
  items: { productId: string; note: string | null; position: number }[]
}

const asDate = (v: unknown): Date => (v instanceof Date ? v : new Date(String(v)))

export async function listPublishedGuides(): Promise<GuideSummary[]> {
  const sql = getSql()
  const rows = await sql<
    { id: string; slug: string; title: string; intro: string | null; cover_slot: string | null; published_at: Date | string; item_count: number }[]
  >`
    select l.id, l.slug, l.title, l.intro, l.cover_slot, l.published_at,
      (select count(*)::int from public.list_items i where i.list_id = l.id) as item_count
    from public.lists l
    where l.type = 'editorial' and l.visibility = 'public' and l.slug is not null
      and l.published_at is not null and l.published_at <= now()
    order by l.published_at desc, l.title`
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    intro: r.intro,
    coverSlot: r.cover_slot,
    publishedAt: asDate(r.published_at),
    itemCount: r.item_count,
  }))
}

export async function getPublishedGuide(slug: string): Promise<GuideDetail | null> {
  const sql = getSql()
  const [l] = await sql<{ id: string; slug: string; title: string; intro: string | null; cover_slot: string | null; published_at: Date | string }[]>`
    select l.id, l.slug, l.title, l.intro, l.cover_slot, l.published_at
    from public.lists l
    where l.type = 'editorial' and l.visibility = 'public' and l.slug = ${slug}
      and l.published_at is not null and l.published_at <= now()`
  if (!l) return null
  const items = await sql<{ product_id: string; note: string | null; position: number }[]>`
    select product_id, note, position from public.list_items where list_id = ${l.id} order by position, created_at`
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    intro: l.intro,
    coverSlot: l.cover_slot,
    publishedAt: asDate(l.published_at),
    itemCount: items.length,
    items: items.map((i) => ({ productId: i.product_id, note: i.note, position: i.position })),
  }
}
