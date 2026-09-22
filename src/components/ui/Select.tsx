'use client'

import { Check, ChevronDown } from 'lucide-react'
import { Select as SelectPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from './cn'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export function Select({
  options,
  placeholder = 'Válassz…',
  id,
  className,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  ...props
}: ComponentProps<typeof SelectPrimitive.Root> & {
  options: SelectOption[]
  placeholder?: string
  id?: string
  className?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}) {
  return (
    <SelectPrimitive.Root {...props}>
      <SelectPrimitive.Trigger
        id={id}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-sm border border-line bg-surface px-3.5 text-left text-body text-ink',
          'hover:border-ink-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep',
          'disabled:opacity-60 aria-invalid:border-pricier data-[placeholder]:text-ink-subtle',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown aria-hidden className="size-4 text-ink-muted" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-80 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-line bg-surface shadow-lift"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                disabled={o.disabled}
                className="relative flex min-h-10 cursor-pointer items-center rounded-sm py-2 pr-3 pl-9 text-body text-ink outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-stone"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2.5">
                  <Check aria-hidden className="size-4" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
