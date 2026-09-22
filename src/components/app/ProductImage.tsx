import Image from 'next/image'
import { cn } from '@/components/ui/cn'

/**
 * Termékkép CSAK a feedből (7. vasszabály), a program feltételei szerint. A feed-hostok előre nem ismertek,
 * ezért optimalizálás nélkül töltjük (a Next képoptimalizálója nem lehet nyílt proxy).
 * Kép nélkül semleges helykitöltő a --stone háttéren.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  className,
  priority = false,
}: {
  src: string | null | undefined
  alt: string
  sizes: string
  className?: string
  priority?: boolean
}) {
  return (
    <div className={cn('relative aspect-[4/5] overflow-hidden rounded-md bg-stone', className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          unoptimized
          priority={priority}
          referrerPolicy="no-referrer"
          className="object-contain p-3"
        />
      ) : (
        <div aria-hidden className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-[2.5rem] text-ink-subtle/60 select-none">
            {Array.from(alt.trim())[0]?.toLocaleUpperCase('hu-HU') ?? ''}
          </span>
        </div>
      )}
    </div>
  )
}
