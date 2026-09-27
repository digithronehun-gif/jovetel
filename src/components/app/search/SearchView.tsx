import Link from 'next/link'
import type { ReactNode } from 'react'
import { ProductCard } from '@/components/app/ProductCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SORT_LABEL } from '@/content/labels'
import { displayProductName } from '@/lib/format'
import { giftHref } from '@/lib/launch'
import { SORT_KEYS, hasFilters, withChange, type RelaxGroup, type RelaxSuggestion, type SearchResult } from '@/lib/search'
import { ActiveFilters } from './ActiveFilters'
import { FilterPanel, type HrefFor } from './FilterPanel'
import { FilterSheet } from './FilterSheet'
import { Pagination } from './Pagination'
import { SortSelect } from './SortSelect'

const RELAX_LABEL: Record<RelaxGroup, string> = {
  brands: 'a márka-szűrő',
  merchants: 'a bolt-szűrő',
  price: 'az ár-szűrő',
  inStock: 'a „Csak készleten” szűrő',
  deal: 'a „Valódi akció” szűrő',
  skin: 'a bőrtípus-szűrő',
  free: 'a „Mentes” szűrő',
}

/**
 * A keresés és a kategóriaoldal közös találati nézete: mobilon szűrő-gomb (alsó lap) + rendezés, desktopon bal oldali
 * szűrőoszlop; aktív szűrők; termékrács; lapozás; üres állapot a legszűkebb szűrő lazításával (PRODUCT_SPEC 5.2).
 */
export function SearchView({
  result,
  hrefFor,
  categoryHref,
  relax,
  now,
  header,
}: {
  result: SearchResult
  hrefFor: HrefFor
  categoryHref: (path: string) => string
  relax: RelaxSuggestion | null
  now: Date
  header?: ReactNode
}) {
  const { state, hits, total } = result
  const activeCount =
    state.brands.length +
    state.merchants.length +
    state.skin.length +
    state.free.length +
    (state.priceMin !== null || state.priceMax !== null ? 1 : 0) +
    (state.inStock ? 1 : 0) +
    (state.deal ? 1 : 0)
  const sortOptions = SORT_KEYS.map((k) => ({ value: k, label: SORT_LABEL[k], href: hrefFor(withChange(state, { sort: k })) }))
  const panel = (id: string) => <FilterPanel result={result} hrefFor={hrefFor} categoryHref={categoryHref} idPrefix={id} />
  const advisor = giftHref(state.q || undefined)

  return (
    <div className="mx-auto w-full max-w-app px-4 pb-16 sm:px-6 md:px-8">
      {header}
      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
        <aside aria-label="Szűrők" className="hidden lg:block">
          <div className="sticky top-6">{panel('oldal')}</div>
        </aside>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-small text-ink-muted" aria-live="polite" data-result-count>
              <span className="font-semibold text-ink tabular-nums">{total.toLocaleString('hu-HU')}</span> termék
            </p>
            <div className="flex min-w-0 items-center gap-2">
              <div className="shrink-0 lg:hidden">
                <FilterSheet activeCount={activeCount} total={total}>
                  {panel('lap')}
                </FilterSheet>
              </div>
              <SortSelect value={state.sort} options={sortOptions} />
            </div>
          </div>
          <ActiveFilters result={result} hrefFor={hrefFor} />
          {result.relaxed && total > 0 ? (
            <p className="rounded-md bg-stone px-4 py-3 text-small text-ink-muted" data-relaxed>
              Minden szóra illő terméket nem találtunk, ezért a hasonló találatokat is mutatjuk.
            </p>
          ) : null}

          {hits.length > 0 ? (
            <>
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3" data-results>
                {hits.map((h, i) => (
                  <li key={h.productId} className="min-w-0">
                    <ProductCard
                      product={{
                        slug: h.slug,
                        name: displayProductName(h.name, h.brandName),
                        brandName: h.brandName,
                        imageUrl: h.imageUrl,
                        cost: h.cost,
                        merchantName: h.merchantName,
                        checkedAt: h.checkedAt,
                        verdict: h.verdict,
                        whyTags: h.why,
                      }}
                      now={now}
                      className="h-full"
                      imageSizes={i < 4 ? '(min-width: 768px) 30vw, 45vw' : undefined}
                    />
                  </li>
                ))}
              </ul>
              <Pagination state={state} pageCount={result.pageCount} hrefFor={hrefFor} />
            </>
          ) : (
            <EmptyState
              title="Erre nem találtunk terméket."
              action={
                <>
                  {relax ? (
                    <Button asChild>
                      <Link href={hrefFor(relax.state)} rel="nofollow">
                        {RELAX_LABEL[relax.group][0]!.toLocaleUpperCase('hu-HU') + RELAX_LABEL[relax.group].slice(1)} nélkül:{' '}
                        {relax.count.toLocaleString('hu-HU')} termék
                      </Link>
                    </Button>
                  ) : null}
                  {advisor ? (
                    <Button asChild variant="secondary">
                      <Link href={advisor}>Kérdezd a tanácsadót</Link>
                    </Button>
                  ) : null}
                  {!relax && (state.q || hasFilters(state)) ? (
                    <Button asChild variant="secondary">
                      <Link href="/kategoria">Böngéssz a kategóriák között</Link>
                    </Button>
                  ) : null}
                </>
              }
            >
              {relax
                ? `Ha elhagyod ${RELAX_LABEL[relax.group]}, ${relax.count.toLocaleString('hu-HU')} terméket mutatunk.`
                : state.q
                  ? 'Próbáld más szavakkal vagy rövidebben, például csak a termék típusával.'
                  : 'Ebben a kategóriában most nincs friss árú termék.'}
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  )
}
