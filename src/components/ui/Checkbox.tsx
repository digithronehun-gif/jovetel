'use client'

import { Check } from 'lucide-react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from './cn'

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer inline-flex size-5 shrink-0 items-center justify-center rounded-[6px] border border-ink-subtle bg-surface transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep',
        'data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=checked]:text-paper',
        'disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-pricier',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check aria-hidden className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

/** Jelölőnégyzet címkével; a teljes sor kattintható (≥ 44 px magas érintési cél). */
export function CheckboxField({
  id,
  label,
  description,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root> & {
  id: string
  label: ReactNode
  description?: ReactNode
}) {
  return (
    <div className="flex min-h-11 items-start gap-3 py-2">
      <Checkbox id={id} className="mt-0.5" {...props} />
      <label htmlFor={id} className="flex cursor-pointer flex-col gap-0.5 text-body text-ink">
        <span>{label}</span>
        {description ? (
          <span className="text-small font-normal text-ink-muted">{description}</span>
        ) : null}
      </label>
    </div>
  )
}
