import { getSql } from '../../client'

export interface CategoryNode {
  id: string
  slug: string
  name: string
  path: string
  parentPath: string | null
  slotId: string | null
  sort: number
  depth: number
}

let cache: { at: number; rows: CategoryNode[] } | null = null
const TTL_MS = 5 * 60_000

/** A teljes kategóriafa (néhány tucat sor), 5 percig a folyamat memóriájában. Nyilvános katalógusadat. */
export async function listCategories(): Promise<CategoryNode[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows
  const sql = getSql()
  const rows = await sql<{ id: string; slug: string; name: string; path: string; slot_id: string | null; sort: number }[]>`
    select id, slug, name, path, slot_id, sort from public.categories order by path`
  const nodes = rows.map((r) => {
    const parts = r.path.split('/')
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      path: r.path,
      parentPath: parts.length > 1 ? parts.slice(0, -1).join('/') : null,
      slotId: r.slot_id,
      sort: r.sort,
      depth: parts.length - 1,
    }
  })
  cache = { at: Date.now(), rows: nodes }
  return nodes
}

export async function getCategoryByPath(path: string): Promise<CategoryNode | null> {
  return (await listCategories()).find((c) => c.path === path) ?? null
}

/** Morzsamenü: a gyökértől az adott kategóriáig. */
export function categoryTrail(all: CategoryNode[], path: string): CategoryNode[] {
  const parts = path.split('/')
  return parts.map((_, i) => all.find((c) => c.path === parts.slice(0, i + 1).join('/'))).filter((c): c is CategoryNode => !!c)
}

export function childCategories(all: CategoryNode[], parentPath: string | null): CategoryNode[] {
  return all.filter((c) => c.parentPath === parentPath).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, 'hu'))
}

/** A kategória képhelye; ha neki nincs, a legközelebbi szülőé. */
export function categorySlot(all: CategoryNode[], path: string): string | null {
  for (const c of categoryTrail(all, path).reverse()) if (c.slotId) return c.slotId
  return null
}

/** Csak teszthez. */
export function __resetCategoryCache() {
  cache = null
}
