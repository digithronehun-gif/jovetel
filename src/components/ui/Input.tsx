import type { ComponentProps } from 'react'
import { cn } from './cn'

export const inputBase = [
  'w-full rounded-sm border border-line bg-surface px-3.5 text-body text-ink',
  'placeholder:text-ink-subtle transition-colors duration-150 ease-sun',
  'hover:border-ink-subtle focus-visible:border-amber-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep',
  'disabled:cursor-not-allowed disabled:bg-stone disabled:opacity-70',
  'aria-invalid:border-pricier aria-invalid:focus-visible:outline-pricier',
].join(' ')

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return <input type={type} className={cn(inputBase, 'h-11', className)} {...props} />
}

export function Textarea({ className, rows = 4, ...props }: ComponentProps<'textarea'>) {
  return <textarea rows={rows} className={cn(inputBase, 'min-h-24 py-2.5', className)} {...props} />
}
