'use client'

import { Check, X } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from './cn'

const chipBase = [
  'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-small transition-colors duration-150 ease-sun',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep',
  'disabled:pointer-events-none disabled:opacity-50',
].join(' ')

/** Választható chip (kapcsoló, `aria-pressed`). A kijelölést ikon is jelzi, nem csak szín. */
export function Chip({
  selected = false,
  onSelectedChange,
  className,
  children,
  icon,
  ...props
}: Omit<ComponentProps<'button'>, 'onChange'> & {
  selected?: boolean
  onSelectedChange?: (next: boolean) => void
  icon?: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={(e) => {
        props.onClick?.(e)
        onSelectedChange?.(!selected)
      }}
      className={cn(
        chipBase,
        selected
          ? 'border-ink bg-ink text-paper'
          : 'border-line bg-surface text-ink hover:border-ink-subtle',
        className,
      )}
      {...props}
    >
      {selected ? <Check aria-hidden className="size-4" /> : icon}
      {children}
    </button>
  )
}

/** Eltávolítható chip (pl. aktív szűrő, értelmezett AI-mező). */
export function RemovableChip({
  children,
  onRemove,
  removeLabel,
  className,
}: {
  children: ReactNode
  onRemove: () => void
  removeLabel: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex min-h-9 items-center gap-1 rounded-full border border-line bg-stone py-1 pr-1 pl-3.5 text-small text-ink',
        className,
      )}
    >
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="inline-flex size-7 items-center justify-center rounded-full text-ink-muted hover:bg-line hover:text-ink focus-visible:outline-2 focus-visible:outline-amber-deep"
      >
        <X aria-hidden className="size-4" />
      </button>
    </span>
  )
}
