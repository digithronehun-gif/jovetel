'use client'

import { Switch as SwitchPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from './cn'

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors duration-150 ease-sun',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep',
        'disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-ink data-[state=unchecked]:bg-line',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block size-6 rounded-full bg-surface shadow-soft transition-transform duration-150 ease-sun',
          'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

/** Kapcsoló címkével és leírással (értesítési hozzájárulások, beállítások). */
export function SwitchField({
  id,
  label,
  description,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root> & {
  id: string
  label: ReactNode
  description?: ReactNode
}) {
  return (
    <div className="flex min-h-11 items-start justify-between gap-4 py-2">
      <label htmlFor={id} className="flex cursor-pointer flex-col gap-0.5 text-body text-ink">
        <span>{label}</span>
        {description ? (
          <span className="text-small font-normal text-ink-muted">{description}</span>
        ) : null}
      </label>
      <Switch id={id} {...props} />
    </div>
  )
}
