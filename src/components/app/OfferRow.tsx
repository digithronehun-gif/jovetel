import { ExternalLink, Truck } from 'lucide-react'
import { cn } from '@/components/ui/cn'
import type { CostBreakdown } from '@/lib/pricing'
import { goHref } from '@/lib/tracking/placements'
import { Disclosure } from './Disclosure'
import { PriceBlock } from './PriceBlock'

export interface OfferRowData {
  offerId: string
  merchantName: string
  cost: CostBreakdown
  inStock: boolean
  checkedAt: Date
  fresh: boolean
  deliveryDaysMin: number | null
  deliveryDaysMax: number | null
}

export function deliveryText(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null
  if (min !== null && max !== null && min !== max) return `${min}–${max} munkanap`
  return `${min ?? max} munkanap`
}

/**
 * Ajánlatsor (DESIGN_SYSTEM 6.): bolt · ár · szállítás · teljes ár · szállítási idő · készlet · [Megnézem a boltban] ·
 * `Disclosure` (3. vasszabály). A 48 óránál régebbi ár „nem friss” jelölést kap (a PriceBlock írja ki).
 */
export function OfferRow({ offer, now }: { offer: OfferRowData; now: Date }) {
  const delivery = deliveryText(offer.deliveryDaysMin, offer.deliveryDaysMax)
  return (
    <li
      data-offer-row
      data-affiliate
      data-offer-fresh={offer.fresh || undefined}
      className={cn('flex flex-col gap-3 border-b border-line py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between', !offer.fresh && 'opacity-80')}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-body font-semibold text-ink">{offer.merchantName}</p>
        <PriceBlock cost={offer.cost} checkedAt={offer.checkedAt} now={now} size="s" />
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-muted">
          <span className={offer.inStock ? 'text-deal' : 'text-pricier'}>{offer.inStock ? 'Készleten' : 'Nincs készleten'}</span>
          {delivery ? (
            <span className="inline-flex items-center gap-1">
              <Truck aria-hidden className="size-4" />
              {delivery}
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 sm:max-w-64 sm:items-end">
        <a
          href={goHref(offer.offerId, 'product_offers')}
          target="_blank"
          rel="sponsored nofollow noopener"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-small font-semibold text-ink hover:border-ink-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep"
          data-cta="offer-row"
        >
          Megnézem a boltban
          <ExternalLink aria-hidden className="size-4" />
          <span className="sr-only">(új lapon nyílik)</span>
        </a>
        <Disclosure className="text-xs sm:text-right" />
      </div>
    </li>
  )
}
