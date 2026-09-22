'use client'

import { Check } from 'lucide-react'
import { RadioGroup } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from './cn'

export interface RadioCardOption {
  value: string
  label: ReactNode
  description?: ReactNode
  media?: ReactNode
  disabled?: boolean
}

/** Nagy választókártyák (onboarding, varázsló). Billentyűzettel nyilakkal léptethető. */
export function RadioCards({
  options,
  value,
  onValueChange,
  columns = 1,
  className,
  'aria-label': ariaLabel,
  name,
}: {
  options: RadioCardOption[]
  value?: string
  onValueChange?: (value: string) => void
  columns?: 1 | 2 | 3
  className?: string
  'aria-label'?: string
  name?: string
}) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={onValueChange}
      aria-label={ariaLabel}
      name={name}
      className={cn(
        'grid gap-3',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-3',
        className,
      )}
    >
      {options.map((opt) => (
        <RadioGroup.Item
          key={opt.value}
          value={opt.value}
          disabled={opt.disabled}
          className={cn(
            'group relative flex min-h-16 w-full items-center gap-4 overflow-hidden rounded-lg border border-line bg-surface p-4 text-left transition-[border-color,box-shadow] duration-150 ease-sun',
            'hover:border-ink-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep',
            'disabled:opacity-50 data-[state=checked]:border-ink data-[state=checked]:shadow-soft',
          )}
        >
          {opt.media ? <span className="shrink-0">{opt.media}</span> : null}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-body font-semibold text-ink">{opt.label}</span>
            {opt.description ? (
              <span className="text-small font-normal text-ink-muted">{opt.description}</span>
            ) : null}
          </span>
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-full border border-ink-subtle group-data-[state=checked]:border-ink group-data-[state=checked]:bg-ink group-data-[state=checked]:text-paper"
          >
            <Check className="hidden size-3.5 group-data-[state=checked]:block" strokeWidth={3} />
          </span>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}
