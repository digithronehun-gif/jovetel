import type { ComponentProps } from 'react'
import { cn } from './cn'

/** Semleges címke (jellemző, kategória). */
export function Tag({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm bg-stone px-2 py-0.5 text-small text-ink-muted',
        className,
      )}
      {...props}
    />
  )
}

const badgeTones = {
  neutral: 'bg-stone text-ink',
  info: 'bg-sky text-ink',
  success: 'bg-deal-bg text-deal',
  warning: 'bg-peach text-ink',
  danger: 'bg-pricier-bg text-pricier',
  ink: 'bg-ink text-paper',
} as const

/** Kis kiemelő jelvény (darabszám, állapot). Állapotot soha ne csak színnel jelezz. */
export function Badge({
  tone = 'neutral',
  className,
  ...props
}: ComponentProps<'span'> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-6 items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  )
}
