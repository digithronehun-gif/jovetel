import { Check } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'
import { PRICE_BANDS, toggle, withChange, type FacetValue, type PriceBand, type SearchResult, type SearchState } from '@/lib/search'
import { PriceBandLabel } from './PriceBandLabel'
import { PriceRangeForm } from './PriceRangeForm'

export type HrefFor = (state: SearchState) => string

/**
 * Szűrők (PRODUCT_SPEC 5.2): minden opció egy link az új állapot URL-jére (JavaScript nélkül is működik), mellette a
 * találatok száma a többi szűrővel. A 0 találatos, nem kiválasztott opció nem kattintható. A szűrőlinkek `nofollow`-k,
 * hogy a keresőrobot ne járja be a szűrőkombinációkat.
 */
export function FilterPanel({
  result,
  hrefFor,
  categoryHref,
  idPrefix,
}: {
  result: SearchResult
  hrefFor: HrefFor
  /** kategória-opció célja (a /kereses-en paraméter, a kategóriaoldalon útvonal) */
  categoryHref: (path: string) => string
  idPrefix: string
}) {
  const { state, facets } = result
  const set = (change: Partial<SearchState>) => hrefFor(withChange(state, change))
  return (
    <div className="flex flex-col gap-6" data-filter-panel>
      {facets.categories.length > 0 ? (
        <Group title="Kategória">
          <ul className="flex flex-col">
            {facets.categories.map((c) => (
              <li key={c.value}>
                <Link
                  href={categoryHref(c.value)}
                  rel="nofollow"
                  scroll={false}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-sm text-body text-ink hover:text-amber-deep"
                >
                  <span>{c.label}</span>
                  <Count n={c.count} />
                </Link>
              </li>
            ))}
          </ul>
        </Group>
      ) : null}

      <Group title="Teljes ár" hint="szállítással együtt">
        <OptionList
          options={facets.priceBands}
          renderLabel={(o) => <PriceBandLabel band={o.value as PriceBand} />}
          hrefFor={(v) => {
            const band = PRICE_BANDS[v as keyof typeof PRICE_BANDS]
            const active = facets.priceBands.find((b) => b.value === v)?.selected
            return active ? set({ priceMin: null, priceMax: null }) : set({ priceMin: band.min, priceMax: band.max })
          }}
        />
        <PriceRangeForm state={state} hrefFor={hrefFor} idPrefix={idPrefix} />
      </Group>

      <Group title="Elérhetőség">
        <OptionList
          options={[
            { value: 'keszleten', label: 'Csak készleten', count: facets.inStock, selected: state.inStock },
            { value: 'akcio', label: 'Valódi akció', count: facets.deal, selected: state.deal },
          ]}
          hrefFor={(v) => (v === 'keszleten' ? set({ inStock: !state.inStock }) : set({ deal: !state.deal }))}
        />
        <p className="text-small text-ink-muted">
          A „Valódi akció” a saját 30 napos ártörténetünkből számol, nem a bolt régi árából.
        </p>
      </Group>

      <Group title="Bőrtípus">
        <OptionList options={facets.skin} hrefFor={(v) => set({ skin: toggle(state.skin, v as SearchState['skin'][number]) })} />
      </Group>

      <Group title="Mentes">
        <OptionList options={facets.free} hrefFor={(v) => set({ free: toggle(state.free, v as SearchState['free'][number]) })} />
      </Group>

      {facets.brands.length > 0 ? (
        <Group title="Márka">
          <OptionList options={facets.brands} hrefFor={(v) => set({ brands: toggle(state.brands, v) })} />
        </Group>
      ) : null}

      {facets.merchants.length > 0 ? (
        <Group title="Bolt">
          <OptionList options={facets.merchants} hrefFor={(v) => set({ merchants: toggle(state.merchants, v) })} />
        </Group>
      ) : null}
    </div>
  )
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-small font-semibold text-ink">
        {title}
        {hint ? <span className="font-normal text-ink-muted"> · {hint}</span> : null}
      </h3>
      {children}
    </section>
  )
}

function Count({ n }: { n: number }) {
  return <span className="text-small text-ink-muted tabular-nums">{n.toLocaleString('hu-HU')}</span>
}

function OptionList({
  options,
  hrefFor,
  renderLabel,
}: {
  options: FacetValue[]
  hrefFor: (value: string) => string
  renderLabel?: (o: FacetValue) => ReactNode
}) {
  return (
    <ul className="flex flex-col">
      {options.map((o) => {
        const disabled = o.count === 0 && !o.selected
        const inner = (
          <>
            <span className="flex items-center gap-2.5">
              <span
                aria-hidden
                className={cn(
                  'inline-flex size-5 shrink-0 items-center justify-center rounded-sm border',
                  o.selected ? 'border-ink bg-ink text-paper' : 'border-line bg-surface',
                )}
              >
                {o.selected ? <Check className="size-3.5" /> : null}
              </span>
              <span>{renderLabel ? renderLabel(o) : o.label}</span>
              {o.selected ? <span className="sr-only">(kiválasztva)</span> : null}
            </span>
            <Count n={o.count} />
          </>
        )
        const cls = 'flex min-h-11 items-center justify-between gap-3 rounded-sm text-body'
        return (
          <li key={o.value}>
            {disabled ? (
              <span aria-disabled className={cn(cls, 'text-ink-subtle')}>
                {inner}
              </span>
            ) : (
              <Link href={hrefFor(o.value)} rel="nofollow" scroll={false} aria-current={o.selected ? 'true' : undefined} className={cn(cls, 'text-ink hover:text-amber-deep')}>
                {inner}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}
