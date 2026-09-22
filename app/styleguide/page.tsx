import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { AiLabel } from '@/components/app/AiLabel'
import { Disclosure } from '@/components/app/Disclosure'
import { Price, PriceBlock } from '@/components/app/PriceBlock'
import { VerdictBadge } from '@/components/app/VerdictBadge'
import { WhyTag } from '@/components/app/WhyTag'
import { LeafShadow, LightLeak, Monogram, RayIcon, Wordmark } from '@/components/brand'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { EmptyState } from '@/components/ui/EmptyState'
import { describedBy, Field } from '@/components/ui/Field'
import { Input, Textarea } from '@/components/ui/Input'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { SlotImage } from '@/components/ui/SlotImage'
import { Stepper } from '@/components/ui/Stepper'
import { Badge, Tag } from '@/components/ui/Tag'
import { slotReport } from '@/lib/assets'
import { contrastRatio } from '@/lib/brand/contrast'
import { COLOR_TOKENS, palette, type ColorToken } from '@/lib/brand/palette'
import { isProductionDeployment } from '@/lib/env'
import { InteractiveDemos, ThemeToggle } from './Demos'

export const metadata: Metadata = {
  title: 'Design rendszer',
  robots: { index: false, follow: false },
}

const PROBA = 'Tűzőgép, őszi fűszál: ŐŰ őű.'

// Minta-időpont: a képernyőképek determinisztikusak maradnak
const NOW = new Date('2026-09-22T10:00:00Z')
const TWO_HOURS_AGO = new Date('2026-09-22T08:00:00Z')
const THREE_DAYS_AGO = new Date('2026-09-19T09:00:00Z')

const TEXT_TOKENS: ColorToken[] = [
  'ink',
  'ink-muted',
  'ink-subtle',
  'amber-deep',
  'sky-deep',
  'deal',
  'usual',
  'pricier',
]

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-8 flex-col gap-6 border-t border-line pt-10">
      <h2 className="text-display-m text-ink">{title}</h2>
      {children}
    </section>
  )
}

function Row({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-eyebrow text-ink-muted">{label}</p>
      <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>
    </div>
  )
}

function Swatches({ mode }: { mode: 'light' | 'dark' }) {
  const t = palette[mode]
  return (
    <div data-theme={mode} className="flex flex-col gap-4 rounded-xl border border-line p-5">
      <p className="text-title">{mode === 'light' ? 'Világos' : 'Sötét'}</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {COLOR_TOKENS.map((token) => {
          const ratio = contrastRatio(t[token], t.paper)
          const isText = TEXT_TOKENS.includes(token)
          return (
            <li key={token} className="flex flex-col gap-1.5">
              <span
                className="h-14 rounded-md border border-line"
                style={{ backgroundColor: `var(--${token})` }}
              />
              <span className="text-small text-ink">--{token}</span>
              <span className="text-xs text-ink-muted tabular-nums">
                {t[token].toUpperCase()} · {ratio.toFixed(1)} : 1
                {isText ? (ratio >= 4.5 ? ' · AA' : ' · csak nagy szöveg') : ''}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const SCALE = [
  ['text-display-xl', 'display-xl · 2,5 → 4,5 rem', 'Rávilágítunk'],
  ['text-display-l', 'display-l · 2,0 → 3,25 rem', 'Kezdjük el. Egy perc az egész.'],
  ['text-display-m', 'display-m · 1,75 → 2,25 rem', 'A 30 napos ár nem hazudik.'],
  ['text-title', 'title · 1,25 → 1,5 rem', 'Anyu névnapja 10 nap múlva'],
  ['text-body-l', 'body-l · 1,0625 → 1,125 rem', 'Mondd el, kinek és mire keresel.'],
  [
    'text-body',
    'body · 1 rem',
    'Tedd a polcodra, amit használsz. Kiszámoljuk, nagyjából mikor fogy el.',
  ],
  ['text-small', 'small · 0,875 rem', 'ár ellenőrizve 2 órája'],
  ['text-eyebrow', 'eyebrow · 0,75 → 0,8125 rem', 'Személyes vásárlási társ'],
] as const

export default function StyleguidePage() {
  if (isProductionDeployment()) notFound()
  const slots = slotReport()

  const cost = {
    priceHuf: 24_990,
    shippingHuf: 990,
    customsHuf: 0,
    totalHuf: 25_980,
    freeShipping: false,
  }
  const freeCost = {
    priceHuf: 18_490,
    shippingHuf: 0,
    customsHuf: 0,
    totalHuf: 18_490,
    freeShipping: true,
  }

  return (
    <main className="mx-auto flex max-w-landing flex-col gap-12 px-4 py-10 sm:px-6 md:px-8">
      <header className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <Wordmark className="h-9" />
          <ThemeToggle />
        </div>
        <SectionHeader
          as="h1"
          size="xl"
          eyebrow="Belső oldal · production-ben 404"
          title={
            <>
              Napfény <em>design rendszer</em>
            </>
          }
          intro="Minden token és komponens minden állapotban. A forrás: docs/specs/DESIGN_SYSTEM.md."
        />
      </header>

      <Section id="proba" title="Próbamondat">
        <div className="flex flex-col gap-4" data-testid="font-proba">
          <p
            className="font-display text-[2.5rem] leading-tight md:text-[3.5rem]"
            data-font="display"
          >
            {PROBA}
          </p>
          <p
            className="font-display text-[2.5rem] leading-tight italic md:text-[3.5rem]"
            data-font="display-italic"
          >
            {PROBA}
          </p>
          <p className="font-display text-[2rem] font-bold">{PROBA}</p>
          <p className="font-sans text-[2rem] md:text-[2.5rem]" data-font="sans">
            {PROBA}
          </p>
          <p className="font-sans text-[2rem] font-bold">{PROBA}</p>
          <p className="text-small text-ink-muted">
            Bodoni Moda (display, csak ≥ 28 px) és Manrope (szöveg), mindkettő latin + latin-ext
            készlettel. Az ő és ű ugyanabból a betűtípusból jön, mint a többi betű.
          </p>
        </div>
      </Section>

      <Section id="szinek" title="Színtokenek">
        <p className="max-w-measure text-body text-ink-muted">
          A kontrasztarány a --paper háttérhez mérve. Az --amber csak dekoráció (szövegre tilos); a
          --ink-subtle csak 18 px felett.
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <Swatches mode="light" />
          <Swatches mode="dark" />
        </div>
      </Section>

      <Section id="tipografia" title="Tipográfia">
        <div className="flex flex-col gap-6">
          {SCALE.map(([cls, label, sample]) => (
            <div key={cls} className="flex flex-col gap-1 border-b border-line pb-4">
              <span className="text-xs text-ink-muted">{label}</span>
              <span className={cn(cls, 'text-ink')}>{sample}</span>
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-ink-muted">
              price-l / price · Manrope 700, tabular-nums
            </span>
            <div className="flex items-baseline gap-6">
              <span className="text-price-l">
                <Price huf={24_990} />
              </span>
              <span className="text-price">
                <Price huf={1_990} />
              </span>
            </div>
          </div>
          <p className="text-display-l text-ink">
            <span className="not-italic">Rávilágítunk</span> <em>a jó vételre.</em>
          </p>
        </div>
      </Section>

      <Section id="forma" title="Tér, forma, árnyék">
        <Row label="Térköz-skála (px)">
          {[4, 8, 12, 16, 24, 32, 48, 64, 96, 128].map((px) => (
            <div key={px} className="flex flex-col items-center gap-1">
              <span className="block rounded-sm bg-amber" style={{ width: px, height: 12 }} />
              <span className="text-xs text-ink-muted tabular-nums">{px}</span>
            </div>
          ))}
        </Row>
        <Row label="Lekerekítés">
          {(
            [
              ['rounded-sm', 'r-sm 10'],
              ['rounded-md', 'r-md 16'],
              ['rounded-lg', 'r-lg 24'],
              ['rounded-xl', 'r-xl 32'],
              ['rounded-full', 'pill'],
            ] as const
          ).map(([cls, label]) => (
            <div key={cls} className="flex flex-col items-center gap-1">
              <span className={cn('block size-20 border border-line bg-stone', cls)} />
              <span className="text-xs text-ink-muted">{label}</span>
            </div>
          ))}
        </Row>
        <Row label="Árnyék (csak emelésre)">
          <div className="flex size-32 items-center justify-center rounded-lg border border-line bg-surface text-small">
            alap: keret
          </div>
          <div className="flex size-32 items-center justify-center rounded-lg bg-surface text-small shadow-soft">
            shadow-soft
          </div>
          <div className="flex size-32 items-center justify-center rounded-lg bg-surface text-small shadow-lift">
            shadow-lift
          </div>
        </Row>
      </Section>

      <Section id="alairas" title="Aláíró elemek">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="text-eyebrow text-ink-muted">Fénysáv a képen (soft-light, 18 mp)</p>
            <div className="relative w-full max-w-[22rem] overflow-hidden rounded-xl">
              <SlotImage slot="landing.hero" sizes="(min-width: 900px) 352px, 90vw" aspect="4/5" />
              <LightLeak surface="image" />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-eyebrow text-ink-muted">Fénysáv a papíron + levélárnyék</p>
            <div className="relative flex aspect-[4/5] w-full max-w-[22rem] items-end overflow-hidden rounded-xl border border-line bg-paper p-6">
              <LeafShadow />
              <LightLeak surface="paper" />
              <p className="relative text-display-m">
                Mielőtt elfogy, <em>szólunk.</em>
              </p>
            </div>
          </div>
        </div>
        <Row label="RayIcon · 16 / 20 / 24 px (az AI jele)">
          <RayIcon size={16} />
          <RayIcon size={20} />
          <RayIcon size={24} />
          <span className="inline-flex items-center gap-2 text-small text-ink-muted">
            <RayIcon size={20} /> Kérdezd a tanácsadót
          </span>
        </Row>
        <Row label="Szóvédjegy és monogram">
          <Wordmark className="h-12 text-ink" />
          <Wordmark className="h-8 text-amber-deep" />
          <Monogram className="size-14 text-ink" />
          <Monogram framed className="size-16 text-ink" />
        </Row>
      </Section>

      <Section id="gombok" title="Gombok">
        <Row label="Változatok">
          <Button>Kezdjük el, ingyenes</Button>
          <Button variant="secondary">Ajándékötlet regisztráció nélkül</Button>
          <Button variant="accent">Megnézem a boltban</Button>
          <Button variant="ghost">Kihagyom</Button>
          <Button variant="link">A teljes leírás →</Button>
        </Row>
        <Row label="Méretek">
          <Button size="sm">Kicsi</Button>
          <Button size="md">Közepes</Button>
          <Button size="lg">Nagy</Button>
        </Row>
        <Row label="Állapotok: hover · fókusz · letiltott · töltés">
          <Button className="shadow-glow">Hover</Button>
          <Button className="outline-2 outline-offset-2 outline-amber-deep">Fókusz</Button>
          <Button disabled>Letiltott</Button>
          <Button loading loadingText="Küldjük…">
            Küldés
          </Button>
          <Button variant="secondary" loading loadingText="Mentés…">
            Mentés
          </Button>
        </Row>
      </Section>

      <Section id="urlap" title="Űrlapelemek">
        <div className="grid max-w-3xl gap-6 md:grid-cols-2">
          <Field id="sg-email" label="E-mail-cím" hint="Erre küldjük a belépési linket.">
            <Input
              id="sg-email"
              type="email"
              placeholder="nev@pelda.hu"
              aria-describedby={describedBy('sg-email', true)}
            />
          </Field>
          <Field id="sg-email-err" label="E-mail-cím" error="Ez nem tűnik érvényes e-mail-címnek.">
            <Input
              id="sg-email-err"
              type="email"
              defaultValue="anna@"
              aria-invalid
              aria-describedby={describedBy('sg-email-err', false, true)}
            />
          </Field>
          <Field id="sg-disabled" label="Letiltott mező">
            <Input id="sg-disabled" disabled defaultValue="Nem szerkeszthető" />
          </Field>
          <Field id="sg-note" label="Megjegyzés" optional>
            <Textarea id="sg-note" placeholder="Pl. M-es méret, a rózsaszínt" />
          </Field>
        </div>
      </Section>

      <InteractiveDemos />

      <Section id="kijelzok" title="Címkék, jelvények, avatar, lépésjelző, skeleton">
        <Row label="Tag · Badge">
          <Tag>Arcápolás</Tag>
          <Tag>30 ml</Tag>
          <Badge>3</Badge>
          <Badge tone="ink">12</Badge>
          <Badge tone="info">Új</Badge>
          <Badge tone="success">Aktív</Badge>
          <Badge tone="warning">Szünetel</Badge>
          <Badge tone="danger">Hiba</Badge>
        </Row>
        <Row label="Avatar (monogram)">
          <Avatar name="Anyu" size="sm" />
          <Avatar name="Kata" />
          <Avatar name="Ödön" size="lg" />
        </Row>
        <div className="max-w-md">
          <Stepper
            current={2}
            total={5}
            labels={['Cél', 'A bőröd', 'Keret', 'Szeretteid', 'Értesítések']}
          />
        </div>
        <Row label="Skeleton (töltés)">
          <div className="flex w-full max-w-sm gap-4">
            <Skeleton className="size-20 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
            </div>
          </div>
        </Row>
      </Section>

      <Section id="fejlec-ures" title="Szekciófejléc és üres állapot">
        <SectionHeader
          eyebrow="Ajándék-radar"
          title={
            <>
              Anyu névnapja 10 nap múlva. <em>Már van három ötleted.</em>
            </>
          }
          intro="Mentsd el a szeretteidet. A névnapot a keresztnévből magunk kikeressük."
        />
        <EmptyState
          title="Erre nem találtunk terméket."
          action={
            <>
              <Button variant="secondary">Szűrők lazítása</Button>
              <Button>
                <RayIcon size={20} /> Kérdezd a tanácsadót
              </Button>
            </>
          }
        >
          Próbáld a „Készleten” szűrő nélkül, vagy kérdezd a tanácsadót.
        </EmptyState>
      </Section>

      <Section id="domain" title="Domain komponensek">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
            <p className="text-eyebrow text-ink-muted">PriceBlock · nagy</p>
            <PriceBlock
              cost={cost}
              merchantName="[DEMO] Napfény Drogéria"
              checkedAt={TWO_HOURS_AGO}
              now={NOW}
              size="l"
              label="Legjobb teljes ár"
            />
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
            <p className="text-eyebrow text-ink-muted">PriceBlock · ingyenes szállítás</p>
            <PriceBlock
              cost={freeCost}
              merchantName="[DEMO] Illat Háza"
              checkedAt={TWO_HOURS_AGO}
              now={NOW}
            />
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
            <p className="text-eyebrow text-ink-muted">PriceBlock · 48 óránál régebbi ár</p>
            <PriceBlock
              cost={cost}
              merchantName="[DEMO] Bőrkert"
              checkedAt={THREE_DAYS_AGO}
              now={NOW}
            />
          </div>
        </div>
        <Row label="VerdictBadge">
          <VerdictBadge kind="deal" />
          <VerdictBadge kind="usual" />
          <VerdictBadge kind="pricier" />
          <VerdictBadge kind="collecting" />
          <VerdictBadge kind="deal" size="sm" />
        </Row>
        <div className="grid gap-6 md:grid-cols-2">
          <VerdictBadge kind="deal" withExplanation />
          <VerdictBadge kind="usual" withExplanation feedDiscountNote />
          <VerdictBadge kind="pricier" withExplanation />
          <VerdictBadge kind="collecting" daysTracked={9} withExplanation />
        </div>
        <Row label="WhyTag (determinisztikus, nem AI)">
          <WhyTag>Zsíros bőrre</WhyTag>
          <WhyTag>Illatmentes</WhyTag>
          <WhyTag>A kereteden belül</WhyTag>
          <WhyTag>30 napja nem volt ilyen olcsó</WhyTag>
        </Row>
        <div className="flex max-w-xl flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Button variant="accent" className="w-fit">
              Megnézem a boltban
            </Button>
            <Disclosure />
          </div>
          <AiLabel />
        </div>
      </Section>

      <Section id="kephelyek" title="Képhelyek">
        <p className="max-w-measure text-body text-ink-muted">
          {slots.length} képhely. „DEV” = moodboard-dev-only licenc: production buildben csak
          ALLOW_DEV_IMAGES=true mellett jelenhet meg (7. vasszabály).
        </p>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {slots.map((s) => (
            <li key={s.slot} className="flex flex-col gap-1.5">
              <SlotImage
                slot={s.slot}
                sizes="(min-width: 1200px) 180px, (min-width: 640px) 25vw, 45vw"
                aspect="4/5"
                className="rounded-md"
              />
              <span className="truncate text-xs font-semibold text-ink">{s.slot}</span>
              <span className="flex items-center gap-1.5">
                <Badge tone={s.productionReady ? 'success' : 'warning'}>
                  {s.productionReady ? 'ÉLES' : 'DEV'}
                </Badge>
                <span className="truncate text-xs text-ink-muted">{s.imageId}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  )
}
