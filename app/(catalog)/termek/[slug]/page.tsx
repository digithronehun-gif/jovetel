import { ExternalLink, Truck } from 'lucide-react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Disclosure } from '@/components/app/Disclosure'
import { LazyPriceHistoryChart } from '@/components/app/LazyPriceHistoryChart'
import { deliveryText, goHref, OfferRow } from '@/components/app/OfferRow'
import { PriceBlock } from '@/components/app/PriceBlock'
import { ProductActions } from '@/components/app/ProductActions'
import { ProductCard } from '@/components/app/ProductCard'
import { ProductImage } from '@/components/app/ProductImage'
import { VerdictBadge } from '@/components/app/VerdictBadge'
import { WhyTag } from '@/components/app/WhyTag'
import { FREE_FROM_LABEL, SKIN_CONCERN_WHY, SKIN_TYPE_WHY } from '@/content/labels'
import { encodePendingAction } from '@/lib/auth/pendingAction'
import { paragraphs } from '@/lib/content/guides'
import { productIndexable } from '@/lib/content/products'
import { categoryTrail, listCategories } from '@/lib/db/queries/catalog/categories'
import { getProductPage } from '@/lib/db/queries/catalog/product'
import { displayProductName, formatSize } from '@/lib/format'
import { budapestDayKey } from '@/lib/format/date'
import { launchMode, siteUrl } from '@/lib/env'
import { loginHref } from '@/lib/launch'
import { formatHuf, rankOffers, verdict } from '@/lib/pricing'
import { whyForYou } from '@/lib/search/why'
import { productJsonLd, serializeJsonLd } from '@/lib/seo/jsonLd'

type Props = { params: Promise<{ slug: string }> }

/** A termék minden ajánlata rangsorolva, a legjobb friss ajánlat ítéletével (PRODUCT_SPEC 5.3, 7.3, 7.4). */
async function load(slug: string) {
  const data = await getProductPage(slug)
  if (!data) return null
  const now = new Date()
  const ranked = rankOffers(
    data.offers.map((o) => ({ ...o, checkedAt: new Date(o.checkedAt), listable: true })),
    now,
  )
  const best = ranked[0]?.fresh ? ranked[0] : null
  const today = budapestDayKey(now)
  const historyOf = (offerId: string) =>
    data.history.filter((h) => h.offerId === offerId).map((h) => ({ day: h.day, minHuf: h.minHuf, lastHuf: h.lastHuf }))
  const bestVerdict = best ? verdict({ currentHuf: best.priceHuf, oldPriceHuf: best.oldPriceHuf, history: historyOf(best.offerId), today }) : null
  return { data, now, ranked, best, bestVerdict, historyOf }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await load((await params).slug)
  if (!r) return {}
  const { data, ranked, best } = r
  const fresh = ranked.filter((o) => o.fresh)
  const indexable = productIndexable({ isIndexable: data.product.isIndexable, description: data.product.description, freshOfferCount: fresh.length })
  return {
    title: data.product.name,
    description: best
      ? `Teljes ár szállítással ${formatHuf(best.cost.totalHuf)}-tól, ${fresh.length} boltban. Ártörténet és „Valódi akció?” a saját napi árainkból.`
      : `${data.product.name}: most nincs friss ajánlat. Ártörténet a saját napi árainkból.`,
    alternates: { canonical: `/termek/${data.product.slug}` },
    robots: indexable ? undefined : { index: false, follow: true },
  }
}

const TAG_LABEL = (tag: string): string | null => {
  const [kind, value = ''] = tag.split(':')
  if (kind === 'skin_type') return SKIN_TYPE_WHY[value as keyof typeof SKIN_TYPE_WHY] ?? null
  if (kind === 'free_from') return FREE_FROM_LABEL[value as keyof typeof FREE_FROM_LABEL] ?? null
  if (kind === 'concern') return SKIN_CONCERN_WHY[value as keyof typeof SKIN_CONCERN_WHY] ?? null
  return null
}

/** Termékoldal (PRODUCT_SPEC 5.3). Minden ár, készlet és szállítás az adatbázisból (1. vasszabály). */
export default async function ProductPage({ params }: Props) {
  const r = await load((await params).slug)
  if (!r) notFound()
  const { data, now, ranked, best, bestVerdict, historyOf } = r
  const p = data.product
  const name = displayProductName(p.name, p.brandName)
  const size = formatSize(p.sizeValue, p.sizeUnit)
  const trail = p.categoryPath ? categoryTrail(await listCategories(), p.categoryPath) : []
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const returnTo = `/termek/${p.slug}`
  const mode = launchMode() === 'live' ? 'login' : 'waitlist'
  const why = best ? whyForYou({ tags: p.tags, totalHuf: best.cost.totalHuf, verdict: bestVerdict?.kind ?? null, merchantId: best.merchantId }, {}) : []
  const features = p.tags.map(TAG_LABEL).filter((x): x is string => !!x)
  const beauty = p.categoryPath?.startsWith('szepsegapolas') ?? false

  const series = ranked
    .map((o) => ({ merchantName: o.merchantName, points: historyOf(o.offerId).map((h) => ({ day: h.day, priceHuf: h.lastHuf })) }))
    .filter((s) => s.points.length > 0)

  const ld = productJsonLd({
    name: p.name,
    url: `${siteUrl()}/termek/${p.slug}`,
    brandName: p.brandName,
    gtin: p.gtin,
    imageUrl: p.imageUrl,
    description: p.description,
    freshPricesHuf: ranked.filter((o) => o.fresh).map((o) => o.priceHuf),
    inStockAny: ranked.some((o) => o.fresh && o.inStock),
  })

  return (
    <article className="mx-auto w-full max-w-app px-4 pt-6 pb-16 sm:px-6 md:px-8 md:pt-8" data-product-page>
      <script type="application/ld+json" nonce={nonce}>
        {serializeJsonLd(ld)}
      </script>
      {trail.length ? (
        <nav aria-label="Morzsamenü" className="pb-4">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-muted">
            {trail.map((c, i) => (
              <li key={c.path} className="flex items-center gap-2">
                {i > 0 ? <span aria-hidden>›</span> : null}
                <Link href={`/kategoria/${c.path}`} className="hover:text-ink">
                  {c.name}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10">
        <ProductImage src={p.imageUrl} alt={p.name} sizes="(min-width: 768px) 420px, 60vw" priority className="mx-auto w-3/5 max-w-60 md:mx-0 md:w-full md:max-w-[26rem]" />

        <div className="flex min-w-0 flex-col gap-5">
          <header className="flex flex-col gap-1.5">
            {p.brandName ? <p className="text-small font-semibold text-ink-muted">{p.brandName}</p> : null}
            <h1 className="text-display-m text-ink">{name}</h1>
            {size ? <p className="text-body text-ink-muted">{size}</p> : null}
            {why.length ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {why.map((t) => (
                  <WhyTag key={t}>{t}</WhyTag>
                ))}
              </div>
            ) : null}
          </header>

          <section aria-labelledby="legjobb-ajanlat" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5" data-best-offer>
            <h2 id="legjobb-ajanlat" className="text-small font-semibold text-ink-muted">
              Legjobb ajánlat
            </h2>
            {best ? (
              <>
                <PriceBlock cost={best.cost} merchantName={best.merchantName} checkedAt={best.checkedAt} now={now} size="l" label="Teljes ár, szállítással együtt" />
                {deliveryText(best.deliveryDaysMin, best.deliveryDaysMax) || !best.inStock ? (
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-muted">
                    <span className={best.inStock ? 'text-deal' : 'text-pricier'}>{best.inStock ? 'Készleten' : 'Most nincs készleten'}</span>
                    {deliveryText(best.deliveryDaysMin, best.deliveryDaysMax) ? (
                      <span className="inline-flex items-center gap-1">
                        <Truck aria-hidden className="size-4" />
                        Szállítás: {deliveryText(best.deliveryDaysMin, best.deliveryDaysMax)}
                      </span>
                    ) : null}
                  </p>
                ) : null}
                <div className="flex flex-col gap-2">
                  <a
                    href={goHref(best.offerId, 'best_offer')}
                    target="_blank"
                    rel="sponsored nofollow noopener"
                    data-cta="best-offer"
                    className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-ink px-7 text-body-l font-semibold text-paper hover:shadow-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep sm:w-fit"
                  >
                    Megnézem a boltban
                    <ExternalLink aria-hidden className="size-5" />
                    <span className="sr-only">(új lapon nyílik)</span>
                  </a>
                  <Disclosure />
                </div>
              </>
            ) : (
              <p className="text-body text-ink-muted" data-no-fresh-offer>
                Most nincs friss ajánlat: az elmúlt 48 órában egyik boltban sem tudtuk ellenőrizni az árát.
              </p>
            )}
            {bestVerdict ? (
              <VerdictBadge kind={bestVerdict.kind} daysTracked={bestVerdict.daysTracked} feedDiscountNote={bestVerdict.feedDiscountNote} withExplanation />
            ) : null}
          </section>

          <ProductActions
            mode={mode}
            showShelf={beauty}
            listHref={loginHref(returnTo, encodePendingAction({ kind: 'list', productSlug: p.slug }))}
            shelfHref={loginHref(returnTo, encodePendingAction({ kind: 'shelf', productSlug: p.slug }))}
            targets={
              best
                ? ([5, 10, 20] as const).map((pct) => ({
                    pct,
                    targetHuf: Math.floor((best.cost.totalHuf * (100 - pct)) / 100),
                    href: loginHref(returnTo, encodePendingAction({ kind: 'price_alert', productSlug: p.slug, targetPct: pct })),
                  }))
                : []
            }
            customHrefTemplate={loginHref(returnTo, `price_alert:${p.slug}:huf:__AMOUNT__`)}
          />
        </div>
      </div>

      {series.length ? (
        <section aria-labelledby="artortenet" className="mt-12 flex flex-col gap-3">
          <h2 id="artortenet" className="text-title text-ink">
            Ártörténet
          </h2>
          <p className="max-w-measure text-small text-ink-muted">
            A saját napi ármérésünk boltonként. A szaggatott vonal a legjobb ajánlat 30 napos minimuma.
          </p>
          <LazyPriceHistoryChart series={series} min30Huf={bestVerdict?.min30Huf ?? null} currentHuf={best?.priceHuf ?? null} title="Napi ár boltonként" />
        </section>
      ) : null}

      <section aria-labelledby="ajanlatok" className="mt-12 flex flex-col gap-2">
        <h2 id="ajanlatok" className="text-title text-ink">
          Összes ajánlat ({ranked.length})
        </h2>
        <p className="text-small text-ink-muted">Teljes ár szerint, szállítással együtt. A 48 óránál régebbi ár a lista végén, jelölve.</p>
        {ranked.length ? (
          <ul data-offer-list>
            {ranked.map((o) => (
              <OfferRow
                key={o.offerId}
                now={now}
                offer={{
                  offerId: o.offerId,
                  merchantName: o.merchantName,
                  cost: o.cost,
                  inStock: o.inStock,
                  checkedAt: o.checkedAt,
                  fresh: o.fresh,
                  deliveryDaysMin: o.deliveryDaysMin,
                  deliveryDaysMax: o.deliveryDaysMax,
                }}
              />
            ))}
          </ul>
        ) : (
          <p className="text-body text-ink-muted">Ennél a terméknél most egy bolt sem kínál ajánlatot.</p>
        )}
      </section>

      {p.description || features.length ? (
        <section aria-labelledby="leiras" className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          {p.description ? (
            <div className="flex flex-col gap-3">
              <h2 id="leiras" className="text-title text-ink">
                Leírás
              </h2>
              <div className="flex max-w-measure flex-col gap-3 text-body text-ink">
                {paragraphs(p.description.replace(/\n/g, '\n\n')).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              <p className="text-small text-ink-muted">A leírás a bolt adataiból származik.</p>
            </div>
          ) : null}
          {features.length ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-title text-ink">Jellemzők</h2>
              <ul className="flex flex-wrap gap-2">
                {features.map((f) => (
                  <li key={f} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-small text-ink">
                    {f}
                  </li>
                ))}
              </ul>
              <p className="text-small text-ink-muted">Kozmetikai jellemzők, nem orvosi állítás.</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {data.related.length ? (
        <section aria-labelledby="kapcsolodo" className="mt-12 flex flex-col gap-4">
          <h2 id="kapcsolodo" className="text-title text-ink">
            Hasonló termékek
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {data.related.map((rp) => (
              <li key={rp.slug} className="min-w-0">
                <ProductCard
                  variant="compact"
                  now={now}
                  className="h-full"
                  product={{
                    slug: rp.slug,
                    name: displayProductName(rp.name, rp.brandName),
                    brandName: rp.brandName,
                    imageUrl: rp.imageUrl,
                    cost: { priceHuf: rp.priceHuf, shippingHuf: rp.shippingHuf, customsHuf: rp.customsHuf, totalHuf: rp.totalHuf, freeShipping: rp.shippingHuf === 0 },
                    merchantName: rp.merchantName,
                    checkedAt: rp.checkedAt,
                    verdict: rp.verdict,
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}
