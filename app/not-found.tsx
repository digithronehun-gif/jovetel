import Link from 'next/link'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SlotImage } from '@/components/ui/SlotImage'

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="tartalom" className="mx-auto grid max-w-landing items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:px-8 md:py-20">
        <div className="flex flex-col gap-6">
          <SectionHeader
            as="h1"
            eyebrow="404"
            title={
              <>
                Ezt az oldalt <em>nem találjuk.</em>
              </>
            }
            intro="Lehet, hogy elírás történt, vagy az oldal már nem él. Kezdd újra a kezdőlapról, vagy keress rá, amit szeretnél."
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/">Vissza a kezdőlapra</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/kereses">Keresés</Link>
            </Button>
          </div>
        </div>
        <SlotImage slot="hiba.404" sizes="(min-width: 900px) 480px, 82vw" aspect="4/5" className="mx-auto w-[82%] max-w-[30rem] rounded-xl md:w-full" />
      </main>
      <SiteFooter />
    </>
  )
}
