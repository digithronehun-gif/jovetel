import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { AiLabel } from '@/components/app/AiLabel'
import { RayIcon } from '@/components/brand/RayIcon'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SlotImage } from '@/components/ui/SlotImage'
import { AI, TRUST } from '@/content/landing'
import { giftHref } from '@/lib/launch'
import { Band } from './Band'

/** AI tanácsadó (PRODUCT_SPEC 3.6): példa-chipek a tanácsadóba, AI-címkével. */
export function AiSection() {
  return (
    <Band slot="landing.ai">
      <SectionHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <RayIcon size={16} className="text-amber-deep" /> {AI.eyebrow}
          </span>
        }
        size="m"
        title={
          <>
            {AI.title} <em>{AI.titleItalic}</em>
          </>
        }
      />
      <ul className="flex flex-col gap-2" aria-label="Példa-kérdések">
        {AI.chips.map((c) => {
          const href = giftHref(c)
          const chip = 'inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-small text-ink'
          return (
            <li key={c}>
              {href ? (
                <Link href={href} className={`${chip} transition-colors hover:border-ink-subtle`}>
                  „{c}”
                  <ArrowRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
                </Link>
              ) : (
                // amíg a tanácsadó nem készült el, a chip csak példa, nem link
                <span className={chip}>„{c}”</span>
              )}
            </li>
          )
        })}
      </ul>
      <AiLabel />
    </Band>
  )
}

/** Bizalom (PRODUCT_SPEC 3.7): a hideg ellenpont (--sky) szekciója. */
export function TrustSection() {
  return (
    <section className="mx-auto max-w-landing px-4 sm:px-6 md:px-8">
      <div className="grid grid-cols-1 items-center gap-8 overflow-hidden rounded-xl bg-sky p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-12 md:p-12">
        <div className="flex flex-col gap-5">
          <SectionHeader eyebrow={<span className="text-ink">{TRUST.eyebrow}</span>} size="l" title={TRUST.title} />
          <p className="max-w-measure text-body-l text-ink">{TRUST.text}</p>
          <Link
            href="/igy-rangsorolunk"
            className="inline-flex min-h-11 w-fit items-center font-semibold text-ink underline decoration-2 underline-offset-4"
          >
            {TRUST.link}
          </Link>
        </div>
        <SlotImage slot="landing.bizalom" sizes="(min-width: 900px) 352px, 80vw" aspect="4/5" className="mx-auto w-full max-w-[22rem] rounded-lg" />
      </div>
    </section>
  )
}
