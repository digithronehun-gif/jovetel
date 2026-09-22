import Link from 'next/link'
import { cn } from '@/components/ui/cn'

export const DISCLOSURE_TEXT =
  'Partnerlink: ha vásárolsz, jutalékot kaphatunk. Ez nem befolyásolja a sorrendet.'

/**
 * 3. vasszabály: MINDEN webshopba vivő gomb mellett ott van. Link az „Így rangsorolunk” oldalra.
 */
export function Disclosure({ className }: { className?: string }) {
  return (
    <p data-disclosure className={cn('text-small font-normal text-ink-muted', className)}>
      {DISCLOSURE_TEXT}{' '}
      <Link
        href="/igy-rangsorolunk"
        className="whitespace-nowrap text-amber-deep underline-offset-4 hover:underline"
      >
        Így rangsorolunk
      </Link>
    </p>
  )
}
