import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'

/** Nyilvános katalógus (keresés, kategóriák, útmutatók, termékoldal): waitlist módban is elérhető (PRODUCT_SPEC 2.). */
export default function CatalogLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="tartalom" className="min-h-[60vh]">
        {children}
      </main>
      <SiteFooter />
    </>
  )
}
