import Link from 'next/link'
import { Wordmark } from '@/components/brand/Wordmark'
import { Button } from '@/components/ui/Button'
import { startHref } from '@/lib/launch'
import { MobileNav } from './MobileNav'

export const NAV_LINKS = [
  { href: '/#hogyan', label: 'Hogyan működik' },
  { href: '/ajandek', label: 'Ajándékötletek' },
  { href: '/igy-rangsorolunk', label: 'Így rangsorolunk' },
] as const

/** Fejléc (PRODUCT_SPEC 3.1). Mobilon: logó + [Kezdjük el] + menü. */
export function SiteHeader() {
  const start = startHref()
  return (
    <header className="relative z-40">
      <div className="mx-auto flex h-16 max-w-landing items-center justify-between gap-4 px-4 sm:px-6 md:h-20 md:px-8">
        <Link href="/" aria-label="JóVétel — kezdőlap" className="rounded-sm text-ink">
          <Wordmark className="h-7 md:h-8" />
        </Link>
        <nav aria-label="Fő navigáció" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-small text-ink-muted transition-colors hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href="/belepes">Belépés</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={start} data-cta="header">
              Kezdjük el
            </Link>
          </Button>
          <MobileNav links={[...NAV_LINKS, { href: '/belepes', label: 'Belépés' }]} />
        </div>
      </div>
    </header>
  )
}
