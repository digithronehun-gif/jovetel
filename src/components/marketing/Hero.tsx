import { Check } from 'lucide-react'
import Link from 'next/link'
import { LightLeak } from '@/components/brand/LightLeak'
import { LeafShadow } from '@/components/brand/LeafShadow'
import { Button } from '@/components/ui/Button'
import { SlotImage } from '@/components/ui/SlotImage'
import { HERO } from '@/content/landing'
import { giftHref } from '@/lib/launch'

/**
 * Hero (PRODUCT_SPEC 3.2): osztott elrendezés, keretezett kép lassan vándorló fénysávval; a cím sorai
 * 60 ms-os lépcsőben jelennek meg (az oldal egyetlen összehangolt mozgása, DESIGN_SYSTEM 9. pont).
 * Mobilon a kép a szöveg fölött (4:5), kisebb méretben, hogy az első képernyőn a gombok is látszanak.
 */
export function Hero({ startHref }: { startHref: string }) {
  const gift = giftHref()
  return (
    <section className="relative isolate overflow-hidden">
      <LeafShadow className="-z-10 opacity-100" />
      <div className="mx-auto grid max-w-landing items-center gap-5 px-4 pt-1 pb-12 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] md:gap-16 md:px-8 md:pt-10 md:pb-24">
        <div className="flex flex-col gap-4 md:gap-7">
          <p className="animate-rise-in text-eyebrow text-amber-deep">{HERO.eyebrow}</p>
          <h1 className="text-display-xl text-ink">
            <span className="block animate-rise-in" style={{ animationDelay: '60ms' }}>
              {HERO.titleStrong}
            </span>
            <em className="block animate-rise-in" style={{ animationDelay: '120ms' }}>
              {HERO.titleItalic}
            </em>
          </h1>
          <p className="max-w-[34rem] animate-rise-in text-body-l text-ink-muted" style={{ animationDelay: '180ms' }}>
            {HERO.subtitle}
          </p>
          <div className="flex animate-rise-in flex-col gap-2.5 sm:flex-row sm:gap-3" style={{ animationDelay: '240ms' }}>
            <Button asChild size="lg">
              <Link href={startHref} data-cta="hero-primary">
                {HERO.primary}
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href={gift ?? '/#hogyan'} data-cta="hero-secondary">
                {gift ? HERO.secondary : HERO.secondaryFallback}
              </Link>
            </Button>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-small text-ink-muted" aria-label="Amit ígérünk">
            {HERO.trust.map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check aria-hidden className="size-4 text-amber-deep" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="order-first mx-auto w-[48%] max-w-[30rem] md:order-none md:w-full" data-hero-image>
          <div className="relative overflow-hidden rounded-xl shadow-soft">
            <SlotImage
              slot="landing.hero"
              priority
              aspect="4/5"
              sizes="(min-width: 900px) 480px, 48vw"
              className="rounded-xl"
            />
            <LightLeak surface="image" />
          </div>
        </div>
      </div>
    </section>
  )
}
