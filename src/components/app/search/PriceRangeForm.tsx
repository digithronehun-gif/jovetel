import { withChange, type SearchState } from '@/lib/search'
import type { HrefFor } from './FilterPanel'

/**
 * Egyéni ártartomány (teljes ár, Ft). Sima GET-űrlap: JavaScript nélkül is működik; a többi szűrő rejtett mezőben marad.
 * A `hrefFor` a cél útvonalát adja (a kategóriaoldalon a kategória az útvonalban van).
 */
export function PriceRangeForm({ state, hrefFor, idPrefix }: { state: SearchState; hrefFor: HrefFor; idPrefix: string }) {
  const target = hrefFor(withChange(state, { priceMin: null, priceMax: null }))
  const [action, query = ''] = target.split('?')
  const hidden = [...new URLSearchParams(query).entries()]
  return (
    <form action={action} method="get" className="grid grid-cols-2 items-end gap-2 pt-1" aria-label="Egyéni ártartomány">
      {hidden.map(([k, v]) => (
        <input key={`${k}=${v}`} type="hidden" name={k} value={v} />
      ))}
      <label className="flex min-w-0 flex-col gap-1 text-small text-ink-muted" htmlFor={`${idPrefix}-ar-min`}>
        Tól (Ft)
        <input
          id={`${idPrefix}-ar-min`}
          name="ar_min"
          inputMode="numeric"
          pattern="[0-9]*"
          defaultValue={state.priceMin ?? ''}
          className="h-11 w-full rounded-sm border border-line bg-surface px-3 text-body text-ink focus-visible:border-amber-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep"
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-small text-ink-muted" htmlFor={`${idPrefix}-ar-max`}>
        Ig (Ft)
        <input
          id={`${idPrefix}-ar-max`}
          name="ar_max"
          inputMode="numeric"
          pattern="[0-9]*"
          defaultValue={state.priceMax ?? ''}
          className="h-11 w-full rounded-sm border border-line bg-surface px-3 text-body text-ink focus-visible:border-amber-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep"
        />
      </label>
      <button
        type="submit"
        className="col-span-2 h-11 rounded-full border border-line bg-surface px-4 text-small font-semibold text-ink hover:border-ink-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep"
      >
        Ártartomány alkalmazása
      </button>
    </form>
  )
}
