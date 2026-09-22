import { Clock } from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { formatRelative } from '@/lib/format/date'
import { formatHuf, isStale, type CostBreakdown } from '@/lib/pricing'

/**
 * AZ ÁR CSAK EBBŐL A MODULBÓL JELENHET MEG (DESIGN_SYSTEM 6. pont, 1. és 6. vasszabály).
 * Minden árszöveg `data-price-block` attribútumú elemen belül van; egy teszt ezt ellenőrzi.
 */

/** Soron belüli összeg (pl. célár-választó, csúszka-címke). */
export function Price({ huf, className }: { huf: number; className?: string }) {
  return (
    <span data-price-block="inline" className={cn('font-bold tabular-nums', className)}>
      {formatHuf(huf)}
    </span>
  )
}

export interface PriceBlockProps {
  cost: CostBreakdown
  merchantName?: string
  /** mikor ellenőriztük az árat (ajánlat `last_seen_at`) */
  checkedAt?: Date | string
  now?: Date
  size?: 'l' | 'm' | 's'
  /** „+ 990 Ft szállítás” bontás */
  showBreakdown?: boolean
  label?: string
  className?: string
}

export function PriceBlock({
  cost,
  merchantName,
  checkedAt,
  now = new Date(),
  size = 'm',
  showBreakdown = true,
  label,
  className,
}: PriceBlockProps) {
  const stale = checkedAt ? isStale(checkedAt, now) : false
  const checked = checkedAt ? formatRelative(checkedAt, now) : null
  const extras = cost.shippingHuf + cost.customsHuf

  return (
    <div
      data-price-block={size}
      data-stale={stale || undefined}
      className={cn('flex flex-col', size === 'l' ? 'gap-1' : 'gap-0.5', className)}
    >
      {label ? <p className="text-small text-ink-muted">{label}</p> : null}
      <p
        className={cn(
          'text-ink',
          size === 'l' && 'text-price-l',
          size === 'm' && 'text-price',
          size === 's' && 'text-body font-bold tabular-nums',
        )}
      >
        {formatHuf(cost.totalHuf)}
      </p>
      {showBreakdown ? (
        <p className="text-small font-normal text-ink-muted tabular-nums">
          {extras > 0 ? (
            <>
              {formatHuf(cost.priceHuf)} + {formatHuf(cost.shippingHuf)} szállítás
              {cost.customsHuf > 0 ? <> + {formatHuf(cost.customsHuf)} vám</> : null}
            </>
          ) : (
            <>ingyenes szállítással</>
          )}
        </p>
      ) : null}
      {merchantName || (checked && !stale) ? (
        <p className="flex flex-wrap items-center gap-x-1.5 text-small font-normal text-ink-muted">
          {merchantName ? <span className="font-semibold text-ink">{merchantName}</span> : null}
          {merchantName && checked && !stale ? <span aria-hidden>·</span> : null}
          {checked && !stale ? <span>ár ellenőrizve {checked}</span> : null}
        </p>
      ) : null}
      {checked && stale ? (
        <p className="inline-flex items-center gap-1 text-small font-normal text-pricier">
          <Clock aria-hidden className="size-3.5 shrink-0" />
          Az ár nem friss: {checked} ellenőriztük.
        </p>
      ) : null}
    </div>
  )
}
