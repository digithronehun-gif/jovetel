import { Hourglass, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/components/ui/cn'
import {
  FEED_DISCOUNT_NOTE,
  VERDICT_LABEL,
  verdictExplanation,
  type VerdictKind,
} from '@/lib/pricing'

const styles: Record<VerdictKind, string> = {
  deal: 'bg-deal-bg text-deal',
  usual: 'bg-usual-bg text-usual',
  pricier: 'bg-pricier-bg text-pricier',
  collecting: 'bg-stone text-ink-muted',
}
const icons = {
  deal: TrendingDown,
  usual: Minus,
  pricier: TrendingUp,
  collecting: Hourglass,
} as const

/**
 * „Valódi akció?” ítélet jelvénye — ikon + szöveg, soha csak szín (DESIGN_SYSTEM 6., 11. pont).
 * Az ítéletet kizárólag a saját napi ártörténetből számoljuk (6. vasszabály).
 */
export function VerdictBadge({
  kind,
  daysTracked,
  withExplanation = false,
  feedDiscountNote = false,
  size = 'md',
  className,
}: {
  kind: VerdictKind
  daysTracked?: number
  withExplanation?: boolean
  /** a bolt kedvezményt jelez, de az ártörténetünk szerint nem valódi */
  feedDiscountNote?: boolean
  size?: 'sm' | 'md'
  className?: string
}) {
  const Icon = icons[kind]
  const badge = (
    <span
      data-verdict={kind}
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full font-bold',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-small',
        styles[kind],
        !withExplanation && className,
      )}
    >
      <Icon aria-hidden className={size === 'sm' ? 'size-3.5' : 'size-4'} strokeWidth={2.25} />
      {VERDICT_LABEL[kind]}
    </span>
  )
  if (!withExplanation) return badge
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {badge}
      <p className="text-small font-normal text-ink-muted">
        {verdictExplanation(kind, daysTracked)}
      </p>
      {feedDiscountNote ? (
        <p className="text-small font-normal text-ink-muted">{FEED_DISCOUNT_NOTE}</p>
      ) : null}
    </div>
  )
}
