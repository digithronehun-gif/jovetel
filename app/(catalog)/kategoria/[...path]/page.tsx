import type { Metadata } from 'next'
import Link from 'next/link'
import { RateLimitedNotice } from '@/components/app/search/RateLimitedNotice'
import { notFound } from 'next/navigation'
import { SearchView } from '@/components/app/search/SearchView'
import { SlotImage } from '@/components/ui/SlotImage'
import { asSlotId } from '@/lib/assets'
import { categorySlot, categoryTrail, childCategories, getCategoryByPath, listCategories } from '@/lib/db/queries/catalog/categories'
import { DEFAULT_STATE, hasFilters, parseSearchState, searchHref, withChange, type SearchState } from '@/lib/search'
import { searchProvider } from '@/lib/search/provider'
import { pageRateLimited } from '@/lib/security/pageLimit'
import { RULES } from '@/lib/security/ratelimit'

type Props = { params: Promise<{ path: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

function pathOf(segments: string[]): string {
  return segments.map((s) => decodeURIComponent(s).toLowerCase()).join('/')
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const path = pathOf((await params).path)
  const cat = await getCategoryByPath(path)
  if (!cat) return {}
  const state = parseSearchState(await searchParams, { category: path })
  // szűrt, rendezett vagy lapozott változat nem indexelődik; a kanonikus URL a szűretlen kategória
  const plain = !hasFilters(state) && state.sort === DEFAULT_STATE.sort && state.page === 1 && !state.q
  return {
    title: cat.name,
    description: `${cat.name}: árak több boltból, szállítással együtt, és a saját ártörténetünk szerinti valódi akciók.`,
    alternates: { canonical: `/kategoria/${path}` },
    robots: plain ? undefined : { index: false, follow: true },
  }
}

/** Kategóriaoldal (PRODUCT_SPEC 2.): képhelyes fejléc, morzsamenü, alkategóriák, a keresés szűrőivel. */
export default async function CategoryPage({ params, searchParams }: Props) {
  if (await pageRateLimited(RULES.searchPage)) return <RateLimitedNotice />
  const path = pathOf((await params).path)
  const all = await listCategories()
  const cat = all.find((c) => c.path === path)
  if (!cat) notFound()
  const state = parseSearchState(await searchParams, { category: path })
  const now = new Date()
  const provider = searchProvider()
  const result = await provider.search(state, { now })
  const relax = result.total === 0 ? await provider.suggestRelaxation(state, { now }) : null

  const base = (p: string) => `/kategoria/${p}`
  const hrefFor = (s: SearchState) => searchHref(base(s.category ?? path), s, { omitCategory: true })
  const categoryHref = (p: string) => hrefFor(withChange(state, { category: p }))
  const trail = categoryTrail(all, path)
  const children = childCategories(all, path)
  const counts = new Map(result.facets.categories.map((c) => [c.value, c.count]))
  const slot = asSlotId(categorySlot(all, path)) ?? 'kategoria.szepsegapolas'

  return (
    <SearchView
      result={result}
      now={now}
      relax={relax}
      hrefFor={hrefFor}
      categoryHref={categoryHref}
      header={
        <header className="grid grid-cols-1 items-center gap-6 pt-6 pb-8 md:grid-cols-[minmax(0,1fr)_20rem] md:gap-10 md:pt-10">
          <div className="flex min-w-0 flex-col gap-4">
            <nav aria-label="Morzsamenü">
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-muted">
                <li>
                  <Link href="/kategoria" className="hover:text-ink">
                    Kategóriák
                  </Link>
                </li>
                {trail.map((c) => (
                  <li key={c.path} className="flex items-center gap-2">
                    <span aria-hidden>›</span>
                    {c.path === path ? (
                      <span aria-current="page" className="text-ink">
                        {c.name}
                      </span>
                    ) : (
                      <Link href={base(c.path)} className="hover:text-ink">
                        {c.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            <h1 className="text-display-l text-ink">{cat.name}</h1>
            <p className="max-w-measure text-body-l text-ink-muted">
              Teljes árak szállítással, több boltból. A „Valódi akció” jelölés a saját napi ártörténetünkből számol.
            </p>
            {children.length ? (
              <ul className="flex flex-wrap gap-2" aria-label="Alkategóriák">
                {children.map((c) => (
                  <li key={c.path}>
                    <Link
                      href={base(c.path)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-small text-ink hover:border-ink-subtle"
                    >
                      {c.name}
                      <span className="text-ink-muted tabular-nums">{(counts.get(c.path) ?? 0).toLocaleString('hu-HU')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <SlotImage slot={slot} sizes="(min-width: 768px) 320px, 100vw" aspect="4/3" priority className="hidden rounded-xl md:block" />
        </header>
      }
    />
  )
}
