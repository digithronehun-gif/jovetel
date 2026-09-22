import type { Metadata } from 'next'
import Link from 'next/link'
import { VerdictBadge } from '@/components/app/VerdictBadge'
import { WhyTag } from '@/components/app/WhyTag'
import { LegalPage, LegalSection } from '@/components/site/LegalPage'
import { RANKING_FACTORS, RANKING_WEIGHTS } from '@/lib/search/weights'

export const metadata: Metadata = {
  title: 'Így rangsorolunk',
  description: 'A JóVétel rangsorának pontos súlyai. A jutalék mértéke nem szempont.',
  alternates: { canonical: '/igy-rangsorolunk' },
}

const pct = (w: number) => `${Math.round(w * 100)}%`

/** A rangsor nyilvános leírása (3. vasszabály). A súlyok ugyanabból a fájlból jönnek, amit a kód használ. */
export default function RankingPage() {
  return (
    <LegalPage
      title="Így rangsorolunk"
      updated="2026-09-22"
      draft={false}
      intro="A sorrendet a te szempontjaid döntik el. A jutalék mértéke nem szempont — ezt a kód szintjén is így építettük."
    >
      <LegalSection title="A „Legjobb egyezés” pontszáma">
        <p>Minden termék pontszáma hat tényező súlyozott összege. A súlyok itt és a kódban ugyanazok:</p>
        <ol className="flex flex-col gap-3" data-ranking-weights>
          {RANKING_FACTORS.map((f) => (
            <li key={f.key} className="flex gap-4 rounded-lg border border-line bg-surface p-4">
              <span className="w-14 shrink-0 text-title text-ink tabular-nums" data-weight={f.key}>
                {pct(RANKING_WEIGHTS[f.key])}
              </span>
              <span className="flex flex-col gap-1">
                <strong className="text-ink">{f.label}</strong>
                <span className="text-small font-normal text-ink-muted">{f.description}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="font-semibold">A jutalék mértéke, a bolt fizetése vagy bármilyen üzleti megállapodás nem szerepel a rangsorban.</p>
      </LegalSection>

      <LegalSection title="Teljes ár">
        <p>
          Mindig a teljes költséget hasonlítjuk össze: ár + szállítás (ha a rendelés nem éri el a bolt ingyenes szállítási
          küszöbét), EU-n kívüli boltnál + vám. A bontást minden ár mellett látod.
        </p>
      </LegalSection>

      <LegalSection title="„Valódi akció?”">
        <p>Az ítéletet kizárólag a saját napi ármérésünkből számoljuk, a bolt „régi ár” adatából soha:</p>
        <ul>
          <li>Ha kevesebb, mint 14 napja figyeljük az árat, nincs ítélet („Még gyűjtjük az ártörténetet”).</li>
          <li>
            <VerdictBadge kind="deal" size="sm" /> ha a mai ár legalább 3%-kal a 30 napos legalacsonyabb ár alatt van.
          </li>
          <li>
            <VerdictBadge kind="pricier" size="sm" /> ha a mai ár több mint 5%-kal a 30 napos szokásos (medián) ár felett van.
          </li>
          <li>
            <VerdictBadge kind="usual" size="sm" /> minden más esetben — akkor is, ha a bolt kedvezményt jelez, de az elmúlt 30
            napban volt már ennyi vagy kevesebb is.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="„Miért neked” címkék">
        <p>
          Ezek nem AI-becslések: az adatbázisból, szabályok alapján jönnek (pl. <WhyTag>Zsíros bőrre</WhyTag>{' '}
          <WhyTag>Illatmentes</WhyTag> <WhyTag>A kereteden belül</WhyTag>). Nincs „AI egyezés %” vagy más kitalált pontszám.
        </p>
      </LegalSection>

      <LegalSection title="Az AI szerepe">
        <p>
          A mesterséges intelligencia csak két dolgot csinál: a szabad szöveges kérdésedet szűrőkké alakítja, és a már
          kiválasztott termékekhez rövid indoklást ír a termék tényeiből. Árat, készletet, kedvezményt soha nem az AI
          mond; az indoklásban számjegy sem lehet.
        </p>
      </LegalSection>

      <LegalSection title="Partnerlinkek">
        <p>
          Minden boltba vivő gomb mellett jelöljük, hogy partnerlink. Részletek: <Link href="/affiliate-tajekoztato">affiliate-tájékoztató</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
