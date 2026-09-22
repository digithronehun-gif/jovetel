import Link from 'next/link'
import { LazyPriceHistoryChart } from '@/components/app/LazyPriceHistoryChart'
import { LovedOneCard } from '@/components/app/LovedOneCard'
import { ProductCard } from '@/components/app/ProductCard'
import { ShelfItem } from '@/components/app/ShelfItem'
import { VerdictBadge } from '@/components/app/VerdictBadge'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { DEMO_IDEAS, DEMOS, demoPriceSeries } from '@/content/landing'
import { Band, DemoFrame } from './Band'

/** Élő bemutatók (PRODUCT_SPEC 3.4) és a kívánságlista (3.5): valódi komponensek minta-adattal. */
export function Demos({ startHref }: { startHref: string }) {
  const chart = demoPriceSeries()
  return (
    <div id="hogyan" className="flex scroll-mt-20 flex-col gap-16 md:gap-24">
      <Band slot="landing.ajandekRadar">
        <SectionHeader
          eyebrow={DEMOS.radar.eyebrow}
          size="m"
          title={
            <>
              {DEMOS.radar.title} <em>{DEMOS.radar.titleItalic}</em>
            </>
          }
          intro={DEMOS.radar.text}
        />
        <DemoFrame>
          <LovedOneCard
            nickname="Anyu"
            relationLabel="Anya"
            firstName="Katalin"
            nextOccasion={{ label: 'névnap', dateLabel: 'november 25.', daysLeft: 10 }}
            budgetLabel="5–15 ezer"
          />
          <ul className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0" aria-label="Három ötlet Anyunak">
            {DEMO_IDEAS.map((idea) => (
              <li key={idea.slug} className="w-[9.5rem] shrink-0 snap-start sm:w-auto">
                <ProductCard
                  variant="compact"
                  href={startHref}
                  product={{ ...idea, imageUrl: null, verdict: null, whyTags: [...idea.whyTags] }}
                  className="h-full p-2"
                  imageSizes="120px"
                />
              </li>
            ))}
          </ul>
        </DemoFrame>
      </Band>

      <Band slot="landing.valodiAkcio" flip>
        <SectionHeader
          eyebrow={DEMOS.deal.eyebrow}
          size="m"
          title={
            <>
              {DEMOS.deal.title} <em>{DEMOS.deal.titleItalic}</em>
            </>
          }
          intro={DEMOS.deal.text}
        />
        <DemoFrame>
          <VerdictBadge kind="deal" withExplanation />
          <LazyPriceHistoryChart
            series={chart.series}
            min30Huf={chart.min30Huf}
            currentHuf={chart.currentHuf}
            showRangeToggle={false}
            height={180}
            title="Ártörténet, 30 nap"
          />
        </DemoFrame>
      </Band>

      <Band slot="landing.szepsegpolc">
        <SectionHeader
          eyebrow={DEMOS.shelf.eyebrow}
          size="m"
          title={
            <>
              {DEMOS.shelf.title} <em>{DEMOS.shelf.titleItalic}</em>
            </>
          }
          intro={DEMOS.shelf.text}
        />
        <DemoFrame>
          <ShelfItem name="C-vitaminos szérum" sizeLabel="30 ml" daysLeft={21} progress={0.78} />
        </DemoFrame>
      </Band>

      <Band slot="landing.listak" flip>
        <SectionHeader
          eyebrow={DEMOS.lists.eyebrow}
          size="m"
          title={
            <>
              {DEMOS.lists.title} <em>{DEMOS.lists.titleItalic}</em>
            </>
          }
          intro={DEMOS.lists.text}
        />
        <Button asChild variant="secondary" className="w-fit">
          <Link href={startHref} data-cta="lists">
            Elkészítem a listámat
          </Link>
        </Button>
      </Band>
    </div>
  )
}
