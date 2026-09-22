import { cn } from './cn'

const sizes = {
  sm: 'size-9 text-lg',
  md: 'size-12 text-2xl',
  lg: 'size-16 text-[2rem]',
} as const

/** Monogram-avatar: a kezdőbetű Bodoni Moda-ban, --peach háttéren (DESIGN_SYSTEM 6. pont). */
export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  size?: keyof typeof sizes
  className?: string
}) {
  const initial = Array.from(name.trim())[0]?.toLocaleUpperCase('hu-HU') ?? '?'
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-peach font-display leading-none text-ink',
        sizes[size],
        className,
      )}
    >
      {initial}
    </span>
  )
}
