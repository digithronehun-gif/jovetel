import type { Metadata } from 'next'
import { LegalPage, LegalSection } from '@/components/site/LegalPage'

export const metadata: Metadata = { title: 'Rólunk', alternates: { canonical: '/rolunk' } }

export default function AboutPage() {
  return (
    <LegalPage
      title="Rólunk"
      updated="2026-09-22"
      draft={false}
      intro="A JóVétel személyes vásárlási társ, ami emlékszik rád. Rávilágítunk a jó vételre."
    >
      <LegalSection title="Miért csináljuk">
        <p>
          A „hol a legolcsóbb?” kérdésre sok helyen kapsz választ. Arra viszont kevés helyen, hogy mit vegyél anyukádnak
          tíz nap múlva, a kereteden belül, magyar boltból, és hogy tényleg akció-e az akció. Mi erre építettünk egy
          ingyenes társat: emlékszik a bőrödre, a szeretteidre és a dátumaikra, figyeli az árakat, és szól, amikor
          vásárolni érdemes.
        </p>
      </LegalSection>
      <LegalSection title="Amit ígérünk">
        <ul>
          <li>Valódi árak több magyar boltból, szállítással együtt, a saját ártörténetünkkel.</li>
          <li>Nem a jutalék rangsorol, és minden partnerlinket jelölünk.</li>
          <li>Az AI nem talál ki árat, és nem ad kitalált pontszámot.</li>
          <li>Az adataid a tieid: letöltheted és törölheted őket.</li>
        </ul>
      </LegalSection>
    </LegalPage>
  )
}
