import type { ReactNode } from 'react'
import type { SlotId } from '@/lib/assets'
import { LeafShadow } from '@/components/brand/LeafShadow'
import { cn } from './cn'
import { SlotImage } from './SlotImage'

/** Üres állapot: képhely + cím + szöveg + gomb, levélárnyékkal (DESIGN_SYSTEM 5.2, 6.). */
export function EmptyState({
  slot = 'ures.alap',
  title,
  children,
  action,
  className,
  compact = false,
}: {
  slot?: SlotId | null
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <section
      className={cn(
        'relative isolate flex flex-col items-center gap-4 overflow-hidden rounded-xl border border-line bg-surface px-6 text-center',
        compact ? 'py-8' : 'py-12',
        className,
      )}
    >
      <LeafShadow className="-z-10" />
      {slot && !compact ? (
        <SlotImage slot={slot} sizes="160px" aspect="4/5" alt="" className="w-32 rounded-lg" />
      ) : null}
      <h2 className="text-title text-ink">{title}</h2>
      {children ? <div className="max-w-measure text-body text-ink-muted">{children}</div> : null}
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </section>
  )
}
