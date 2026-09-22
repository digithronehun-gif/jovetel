import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

/**
 * „Miért neked” címke (PRODUCT_SPEC 7.1): determinisztikus, az adatbázisból, ezért NINCS rajta
 * RayIcon (nem AI). --peach háttér.
 */
export function WhyTag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      data-why-tag
      className={cn(
        'inline-flex items-center rounded-sm bg-peach px-2 py-0.5 text-xs font-semibold text-ink',
        className,
      )}
    >
      {children}
    </span>
  )
}
