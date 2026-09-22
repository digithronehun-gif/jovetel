import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from './cn'

const iconButtonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-sun',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep',
    'disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        ghost: 'text-ink hover:bg-stone',
        secondary: 'border border-line bg-surface text-ink hover:border-ink-subtle',
        primary: 'bg-ink text-paper hover:shadow-glow',
      },
      size: {
        sm: 'size-10 [&_svg]:size-4',
        md: 'size-11 [&_svg]:size-5',
        lg: 'size-13 [&_svg]:size-6',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
)

/** Csak ikonos gomb — az `aria-label` kötelező, mert nincs látható szöveg. */
export function IconButton({
  className,
  variant,
  size,
  'aria-label': ariaLabel,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof iconButtonVariants> & { 'aria-label': string }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
