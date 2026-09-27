import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Price } from '@/components/app/PriceBlock'
import { activeBand, hasFilters, withChange, type SearchResult, type SearchState } from '@/lib/search'
import { PRICE_BAND_LABEL } from '@/content/labels'
import type { HrefFor } from './FilterPanel'

/** Aktív szűrők eltávolítható chipként (link: JavaScript nélkül is), és „Szűrők törlése”. */
export function ActiveFilters({ result, hrefFor }: { result: SearchResult; hrefFor: HrefFor }) {
  const { state, facets } = result
  if (!hasFilters(state)) return null
  const set = (change: Partial<SearchState>) => hrefFor(withChange(state, change))
  const label = (list: { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v
  const chips: { key: string; label: ReactNode; href: string }[] = []
  const band = activeBand(state)
  if (band) chips.push({ key: 'ar', label: PRICE_BAND_LABEL[band], href: set({ priceMin: null, priceMax: null }) })
  else if (state.priceMin !== null || state.priceMax !== null) {
    chips.push({
      key: 'ar',
      label:
        state.priceMin !== null && state.priceMax !== null ? (
          <>
            <Price huf={state.priceMin} className="font-normal" /> – <Price huf={state.priceMax} className="font-normal" />
          </>
        ) : state.priceMin !== null ? (
          <>
            legalább <Price huf={state.priceMin} className="font-normal" />
          </>
        ) : (
          <>
            legfeljebb <Price huf={state.priceMax!} className="font-normal" />
          </>
        ),
      href: set({ priceMin: null, priceMax: null }),
    })
  }
  if (state.inStock) chips.push({ key: 'keszleten', label: 'Csak készleten', href: set({ inStock: false }) })
  if (state.deal) chips.push({ key: 'akcio', label: 'Valódi akció', href: set({ deal: false }) })
  for (const s of state.skin) chips.push({ key: `bor-${s}`, label: `${label(facets.skin, s)} bőr`, href: set({ skin: state.skin.filter((x) => x !== s) }) })
  for (const f of state.free) chips.push({ key: `mentes-${f}`, label: label(facets.free, f), href: set({ free: state.free.filter((x) => x !== f) }) })
  for (const b of state.brands) chips.push({ key: `marka-${b}`, label: label(facets.brands, b), href: set({ brands: state.brands.filter((x) => x !== b) }) })
  for (const m of state.merchants) chips.push({ key: `bolt-${m}`, label: label(facets.merchants, m), href: set({ merchants: state.merchants.filter((x) => x !== m) }) })
  const clear = hrefFor({ ...state, brands: [], merchants: [], priceMin: null, priceMax: null, inStock: false, deal: false, skin: [], free: [], page: 1 })
  return (
    <div className="flex flex-wrap items-center gap-2" data-active-filters>
      {chips.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          rel="nofollow"
          scroll={false}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-stone py-1 pr-2 pl-3.5 text-small text-ink hover:border-ink-subtle"
        >
          <span>{c.label}</span>
          <X aria-hidden className="size-4 text-ink-muted" />
          <span className="sr-only">szűrő eltávolítása</span>
        </Link>
      ))}
      <Link href={clear} rel="nofollow" scroll={false} className="min-h-9 px-2 py-1 text-small text-amber-deep underline underline-offset-4">
        Szűrők törlése
      </Link>
    </div>
  )
}
