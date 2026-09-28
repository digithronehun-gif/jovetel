import type { Metadata } from 'next'
import Link from 'next/link'
import { RateLimitedNotice } from '@/components/app/search/RateLimitedNotice'
import { SearchForm } from '@/components/app/search/SearchForm'
import { SearchView } from '@/components/app/search/SearchView'
import { categoryTrail, listCategories } from '@/lib/db/queries/catalog/categories'
import { parseSearchState, searchHref, withChange } from '@/lib/search'
import { searchProvider } from '@/lib/search/provider'
import { pageRateLimited } from '@/lib/security/pageLimit'
import { RULES } from '@/lib/security/ratelimit'

type Params = Promise<Record<string, string | string[] | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: Params }): Promise<Metadata> {
  const state = parseSearchState(await searchParams)
  return {
    title: state.q ? `„${state.q}” – keresés` : 'Keresés',
    // a keresési találatoldalak nem kerülnek a keresők indexébe (a kategóriaoldalak igen)
    robots: { index: false, follow: true },
  }
}

/** Keresés (PRODUCT_SPEC 5.2): szabad szöveg + szűrők, URL-ben tárolt állapot. Belépés nélkül is. */
export default async function SearchPage({ searchParams }: { searchParams: Params }) {
  if (await pageRateLimited(RULES.searchPage)) return <RateLimitedNotice />
  const state = parseSearchState(await searchParams)
  const now = new Date()
  const provider = searchProvider()
  const [result, categories] = await Promise.all([provider.search(state, { now }), listCategories()])
  const relax = result.total === 0 ? await provider.suggestRelaxation(state, { now }) : null
  const hrefFor = (s: typeof state) => searchHref('/kereses', s)
  const trail = state.category ? categoryTrail(categories, state.category) : []

  return (
    <SearchView
      result={result}
      now={now}
      relax={relax}
      hrefFor={hrefFor}
      categoryHref={(path) => hrefFor(withChange(state, { category: path }))}
      header={
        <header className="flex flex-col gap-4 pt-6 pb-6 md:pt-10">
          <p className="text-eyebrow text-ink-muted">Keresés</p>
          <h1 className="text-display-m text-ink">{state.q ? `„${state.q}”` : 'Mit keresel?'}</h1>
          <SearchForm q={state.q} className="max-w-prose" />
          {trail.length ? (
            <p className="flex flex-wrap items-center gap-x-2 text-small text-ink-muted">
              <span>Kategória:</span>
              <span className="font-semibold text-ink">{trail.map((c) => c.name).join(' › ')}</span>
              <Link href={hrefFor(withChange(state, { category: null }))} rel="nofollow" className="text-amber-deep underline underline-offset-4">
                minden kategória
              </Link>
            </p>
          ) : null}
        </header>
      }
    />
  )
}
