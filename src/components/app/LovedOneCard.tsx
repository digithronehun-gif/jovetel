import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/components/ui/cn'

/**
 * Szerettünk kártyája (DESIGN_SYSTEM 6. pont): avatar, becenév, kapcsolat, következő alkalom +
 * visszaszámláló pill, keret.
 */
export function LovedOneCard({
  nickname,
  relationLabel,
  firstName,
  nextOccasion,
  budgetLabel,
  href,
  className,
}: {
  nickname: string
  relationLabel: string
  firstName?: string | null
  nextOccasion?: { label: string; dateLabel: string; daysLeft: number } | null
  budgetLabel?: string | null
  href?: string
  className?: string
}) {
  return (
    <article
      data-loved-one-card
      className={cn('relative flex items-start gap-4 rounded-lg border border-line bg-surface p-4', className)}
    >
      <Avatar name={nickname} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="text-title text-ink">
          {href ? (
            <Link href={href} className="after:absolute after:inset-0 after:rounded-lg">
              {nickname}
            </Link>
          ) : (
            nickname
          )}
        </h3>
        <p className="text-small font-normal text-ink-muted">
          {relationLabel}
          {firstName ? ` · ${firstName}` : ''}
        </p>
        {nextOccasion ? (
          <p className="flex flex-wrap items-center gap-2 text-small text-ink">
            <span>
              {nextOccasion.label}: {nextOccasion.dateLabel}
            </span>
            <span className="rounded-full bg-peach px-2.5 py-0.5 text-xs font-bold text-ink tabular-nums">
              {nextOccasion.daysLeft === 0 ? 'ma' : `${nextOccasion.daysLeft} nap`}
            </span>
          </p>
        ) : null}
        {budgetLabel ? <p className="text-xs text-ink-muted">Keret: {budgetLabel}</p> : null}
      </div>
    </article>
  )
}
