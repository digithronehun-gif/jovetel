import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { pickUtm } from '@/lib/analytics/utm'
import { CtaClickTracker, TrackView } from '@/components/consent/Trackers'
import { AiSection, TrustSection } from '@/components/marketing/AiAndTrust'
import { Demos } from '@/components/marketing/Demos'
import { Faq, FinalCta } from '@/components/marketing/FaqAndCta'
import { Hero } from '@/components/marketing/Hero'
import { Promises } from '@/components/marketing/Promises'
import { isWaitlistMode, startHref } from '@/lib/launch'

export const metadata: Metadata = {
  title: { absolute: 'JóVétel — Rávilágítunk a jó vételre.' },
  description:
    'Mondd el, kinek és mire keresel. Megmutatjuk, mi éri meg valóban magyar boltokban, és szólunk, amikor eljön az ideje. Ingyenes.',
  alternates: { canonical: '/' },
}

/** Landing (PRODUCT_SPEC 3. pont). A belépett felhasználót a proxy az /app-ra irányítja (F7). */
export default async function LandingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const sp = await searchParams
  const utm = pickUtm((k) => sp[k])
  const start = startHref()
  return (
    <main id="tartalom" className="flex flex-col gap-16 pb-16 md:gap-24 md:pb-24">
      <TrackView name="landing_view" />
      <CtaClickTracker />
      <Hero startHref={start} />
      <Promises />
      <Demos startHref={start} />
      <AiSection />
      <TrustSection />
      <Faq />
      <FinalCta waitlist={isWaitlistMode()} startHref={start} nonce={nonce} utm={utm} />
    </main>
  )
}
