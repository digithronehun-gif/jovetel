import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { LightLeak } from '@/components/brand/LightLeak'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SlotImage } from '@/components/ui/SlotImage'
import { FAQ, FINAL_CTA } from '@/content/landing'
import { WaitlistForm } from './WaitlistForm'

/** GYIK (PRODUCT_SPEC 3.8): natív <details>, JavaScript nélkül is akadálymentes. */
export function Faq() {
  return (
    <section aria-labelledby="gyik" className="mx-auto max-w-prose px-4 sm:px-6">
      <SectionHeader as="h2" size="l" title={<span id="gyik">Gyakori kérdések</span>} />
      <div className="mt-8 flex flex-col divide-y divide-line border-y border-line">
        {FAQ.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-body-l font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDown aria-hidden className="size-5 shrink-0 text-ink-muted transition-transform duration-150 group-open:rotate-180" />
            </summary>
            <p className="pb-5 text-body text-ink-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

/** Záró CTA (PRODUCT_SPEC 3.9); várólista módban itt van az űrlap (#varolista). */
export function FinalCta({
  waitlist,
  startHref,
  nonce,
  utm,
}: {
  waitlist: boolean
  startHref: string
  nonce?: string
  utm?: Record<string, string>
}) {
  return (
    <section id="varolista" className="mx-auto max-w-landing scroll-mt-20 px-4 sm:px-6 md:px-8">
      <div className="relative isolate grid items-center gap-8 overflow-hidden rounded-xl border border-line bg-surface p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:gap-12 md:p-12">
        <LightLeak surface="paper" animated={false} className="-z-10" />
        <div className="flex flex-col gap-6">
          <SectionHeader
            size="l"
            title={
              <>
                {FINAL_CTA.title} <em className="block">{FINAL_CTA.titleItalic}</em>
              </>
            }
            intro={waitlist ? FINAL_CTA.waitlistIntro : undefined}
          />
          {waitlist ? (
            <WaitlistForm nonce={nonce} utm={utm} />
          ) : (
            <Button asChild size="lg" className="w-fit">
              <Link href={startHref} data-cta="final">
                {FINAL_CTA.button}
              </Link>
            </Button>
          )}
        </div>
        <SlotImage slot="landing.zaroCta" sizes="(min-width: 900px) 384px, 80vw" aspect="4/5" className="mx-auto hidden w-full max-w-[24rem] rounded-lg md:block" />
      </div>
    </section>
  )
}
