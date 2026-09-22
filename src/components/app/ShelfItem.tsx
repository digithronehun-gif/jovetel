import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'
import { ProductImage } from './ProductImage'

/**
 * Szépségpolc-tétel (DESIGN_SYSTEM 6. pont): folyamatjelző --amber → --pricier az utolsó 10 napban,
 * „kb. 12 nap múlva fogy el”, mindig „becslés, módosítható” jelöléssel (PRODUCT_SPEC 7.5).
 */
export function ShelfItem({
  name,
  sizeLabel,
  imageUrl,
  daysLeft,
  progress,
  actions,
  className,
}: {
  name: string
  sizeLabel?: string | null
  imageUrl?: string | null
  /** becsült hátralévő napok; negatív: már elfogyhatott */
  daysLeft: number
  /** 0–1: mennyi fogyott el */
  progress: number
  actions?: ReactNode
  className?: string
}) {
  const urgent = daysLeft <= 10
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100)
  const when =
    daysLeft <= 0
      ? 'kb. most fogy el'
      : daysLeft < 21
        ? `kb. ${daysLeft} nap múlva fogy el`
        : `kb. ${Math.round(daysLeft / 7)} hét múlva fogy el`
  return (
    <article data-shelf-item className={cn('flex gap-4 rounded-lg border border-line bg-surface p-4', className)}>
      <ProductImage src={imageUrl} alt={name} sizes="80px" className="w-20 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="line-clamp-2 text-body font-semibold text-ink">
          {name}
          {sizeLabel ? <span className="font-normal text-ink-muted">, {sizeLabel}</span> : null}
        </h3>
        <div
          role="meter"
          aria-label="Mennyi fogyott el"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="h-2 overflow-hidden rounded-full bg-stone"
        >
          <div className={cn('h-full rounded-full', urgent ? 'bg-pricier' : 'bg-amber')} style={{ width: `${pct}%` }} />
        </div>
        <p className={cn('text-small', urgent ? 'text-pricier' : 'text-ink')}>
          {when} <span className="font-normal text-ink-muted">· becslés, módosítható</span>
        </p>
        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </div>
    </article>
  )
}
