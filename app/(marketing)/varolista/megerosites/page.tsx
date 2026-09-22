import type { Metadata } from 'next'
import Link from 'next/link'
import { confirmWaitlistAction } from '@/app/actions/waitlist-confirm'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SlotImage } from '@/components/ui/SlotImage'

export const metadata: Metadata = { title: 'Várólista megerősítése', robots: { index: false, follow: false } }

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const done = sp.kesz === '1'
  const error = sp.hiba
  const token = sp.t ?? ''

  return (
    <main id="tartalom" className="mx-auto grid max-w-landing items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:px-8 md:py-20">
      <div className="flex flex-col gap-6">
        {done ? (
          <SectionHeader
            as="h1"
            eyebrow="Várólista"
            title={
              <>
                Köszönjük, <em>fent vagy a listán.</em>
              </>
            }
            intro="Szólunk, amint indulunk. Addig is nézz körül a nyilvános részen: a keresés és az ajándékötletek belépés nélkül is működnek."
          />
        ) : error ? (
          <SectionHeader
            as="h1"
            eyebrow="Várólista"
            title="Ez a link már nem érvényes."
            intro={
              error === 'expired'
                ? 'A megerősítő link 7 napig él. Iratkozz fel újra, és küldünk egy újat.'
                : 'Lehet, hogy elírás történt, vagy egy újabb levelet is kaptál. Iratkozz fel újra, és küldünk egy friss linket.'
            }
          />
        ) : (
          <>
            <SectionHeader
              as="h1"
              eyebrow="Várólista"
              title={
                <>
                  Egy kattintás, <em>és kész.</em>
                </>
              }
              intro="Erősítsd meg, hogy a tiéd ez az e-mail-cím, és felkerülsz a várólistára."
            />
            <form action={confirmWaitlistAction}>
              <input type="hidden" name="t" value={token} />
              <Button type="submit" size="lg" data-cta="waitlist-confirm">
                Megerősítem
              </Button>
            </form>
          </>
        )}
        {done || error ? (
          <Button asChild variant="secondary" className="w-fit">
            <Link href={error ? '/#varolista' : '/'}>{error ? 'Újra feliratkozom' : 'Vissza a kezdőlapra'}</Link>
          </Button>
        ) : null}
      </div>
      <SlotImage slot="landing.zaroCta" sizes="(min-width: 900px) 480px, 90vw" aspect="4/5" className="mx-auto w-full max-w-[30rem] rounded-xl" priority />
    </main>
  )
}
