import Link from 'next/link'
import { Wordmark } from '@/components/brand/Wordmark'
import { ConsentSettingsLink } from '@/components/consent/ConsentBanner'

const LEGAL = [
  { href: '/adatvedelem', label: 'Adatkezelési tájékoztató' },
  { href: '/aszf', label: 'ÁSZF' },
  { href: '/impresszum', label: 'Impresszum' },
  { href: '/cookie', label: 'Süti-tájékoztató' },
  { href: '/affiliate-tajekoztato', label: 'Affiliate-tájékoztató' },
  { href: '/igy-rangsorolunk', label: 'Így rangsorolunk' },
  { href: '/rolunk', label: 'Rólunk' },
] as const

/** Lábléc (PRODUCT_SPEC 3.10): jogi linkek, jelölés, © 2026 JóVétel. */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex max-w-landing flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:justify-between md:px-8">
        <div className="flex max-w-sm flex-col gap-3">
          <Wordmark className="h-7 w-fit self-start text-ink" />
          <p className="text-small font-normal text-ink-muted">Rávilágítunk a jó vételre.</p>
          <p className="text-small font-normal text-ink-muted" data-disclosure>
            Az oldalon partnerlinkek találhatók. Ha rajtuk keresztül vásárolsz, jutalékot kaphatunk. Ez nem
            befolyásolja a sorrendet.
          </p>
        </div>
        <nav aria-label="Jogi információk" className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
          {LEGAL.map((l) => (
            <Link key={l.href} href={l.href} className="text-small text-ink-muted hover:text-ink">
              {l.label}
            </Link>
          ))}
          <ConsentSettingsLink className="text-left text-small text-ink-muted hover:text-ink" />
        </nav>
      </div>
      <div className="mx-auto max-w-landing px-4 pb-8 text-xs text-ink-muted sm:px-6 md:px-8">© 2026 JóVétel</div>
    </footer>
  )
}
