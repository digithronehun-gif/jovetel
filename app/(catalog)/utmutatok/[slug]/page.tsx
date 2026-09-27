import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProductCard } from '@/components/app/ProductCard'
import { SlotImage } from '@/components/ui/SlotImage'
import { asSlotId } from '@/lib/assets'
import { guideIndexability, paragraphs } from '@/lib/content/guides'
import { getPublishedGuide } from '@/lib/db/queries/catalog/guides'
import { getProductCards } from '@/lib/db/queries/catalog/productCards'
import { displayProductName, formatDate } from '@/lib/format'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = await getPublishedGuide((await params).slug)
  if (!guide) return {}
  const { indexable } = guideIndexability({ intro: guide.intro, notes: guide.items.map((i) => i.note) })
  return {
    title: guide.title,
    description: paragraphs(guide.intro)[0]?.slice(0, 160),
    alternates: { canonical: `/utmutatok/${guide.slug}` },
    // PRODUCT_SPEC 9.: indexelés csak ≥ 5 tétel és ≥ 150 szó szerkesztői szöveg mellett
    robots: indexable ? undefined : { index: false, follow: true },
  }
}

/** Egy szerkesztői útmutató: bevezető, képhelyes borító, tételek szerkesztői megjegyzéssel és friss árral. */
export default async function GuidePage({ params }: Props) {
  const guide = await getPublishedGuide((await params).slug)
  if (!guide) notFound()
  const now = new Date()
  const cards = await getProductCards(guide.items.map((i) => i.productId), now)
  return (
    <article className="mx-auto w-full max-w-app px-4 pt-6 pb-16 sm:px-6 md:px-8 md:pt-10">
      <header className="grid grid-cols-1 items-center gap-6 pb-10 md:grid-cols-[minmax(0,1fr)_22rem] md:gap-12">
        <div className="flex min-w-0 flex-col gap-4">
          <nav aria-label="Morzsamenü" className="text-small text-ink-muted">
            <Link href="/utmutatok" className="hover:text-ink">
              Útmutatók
            </Link>
          </nav>
          <h1 className="text-display-l text-ink">{guide.title}</h1>
          <p className="text-small text-ink-muted">
            Szerkesztőség · {formatDate(guide.publishedAt)} · {guide.items.length} termék
          </p>
          <div className="flex max-w-measure flex-col gap-3 text-body-l text-ink">
            {paragraphs(guide.intro).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
        <SlotImage slot={asSlotId(guide.coverSlot) ?? 'utmutato.boritokep'} sizes="(min-width: 768px) 352px, 100vw" aspect="4/3" priority className="rounded-xl" />
      </header>

      <ol className="flex max-w-prose flex-col gap-6" data-guide-items>
        {guide.items.map((item, i) => {
          const c = cards.get(item.productId)
          if (!c) return null
          return (
            <li key={item.productId} className="flex flex-col gap-3">
              <p className="text-eyebrow text-ink-muted">{i + 1}.</p>
              <ProductCard
                variant="row"
                now={now}
                product={{
                  slug: c.slug,
                  name: displayProductName(c.name, c.brandName),
                  brandName: c.brandName,
                  imageUrl: c.imageUrl,
                  cost: c.offer
                    ? {
                        priceHuf: c.offer.priceHuf,
                        shippingHuf: c.offer.shippingHuf,
                        customsHuf: c.offer.customsHuf,
                        totalHuf: c.offer.totalHuf,
                        freeShipping: c.offer.shippingHuf === 0,
                      }
                    : null,
                  merchantName: c.offer?.merchantName,
                  checkedAt: c.offer?.checkedAt,
                  verdict: c.offer?.verdict ?? null,
                }}
              />
              {item.note ? (
                <p className="border-l-2 border-amber pl-4 text-body text-ink-muted">
                  <span className="sr-only">Szerkesztői megjegyzés: </span>
                  {item.note}
                </p>
              ) : null}
            </li>
          )
        })}
      </ol>
    </article>
  )
}
