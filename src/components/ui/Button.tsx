import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from './cn'
import { Spinner } from './Spinner'

export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none',
    'transition-[background-color,box-shadow,color,border-color,transform] duration-150 ease-sun',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-ink text-paper hover:shadow-glow active:translate-y-px',
        secondary: 'border border-line bg-surface text-ink hover:border-ink-subtle hover:bg-paper',
        accent: 'bg-amber-deep text-on-accent hover:shadow-glow active:translate-y-px',
        ghost: 'text-ink hover:bg-stone',
        link: 'h-auto rounded-sm px-0 text-amber-deep underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-10 px-4 text-small [&_svg]:size-4',
        md: 'h-11 px-5 text-body [&_svg]:size-5',
        lg: 'h-13 px-7 text-body-l [&_svg]:size-5',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0' }],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
    /** Töltés közben a gombon olvasható szöveg (képernyőolvasónak is). */
    loadingText?: string
  }

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingText,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-disabled={asChild && (disabled || loading) ? true : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : loading ? (
        <>
          <Spinner />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        children
      )}
    </Comp>
  )
}
