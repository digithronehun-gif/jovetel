import type { Metadata } from 'next'
import Link from 'next/link'
import { DISCLOSURE_TEXT } from '@/components/app/Disclosure'
import { Fill, LegalPage, LegalSection } from '@/components/site/LegalPage'

export const metadata: Metadata = { title: 'Affiliate-tájékoztató', alternates: { canonical: '/affiliate-tajekoztato' } }

export default function AffiliatePage() {
  return (
    <LegalPage
      title="Affiliate-tájékoztató"
      updated="2026-09-22"
      intro="Így tartjuk fenn a JóVételt ingyenesen, és így biztosítjuk, hogy ez ne befolyásolja, mit mutatunk."
      draft={false}
    >
      <LegalSection title="Mi az a partnerlink?">
        <p>
          A boltokba vivő gombok partnerlinkek. Ha rajtuk keresztül vásárolsz, a bolt a partnerhálózaton át
          jutalékot fizethet nekünk. Neked ez semmibe nem kerül, és az árat nem változtatja meg.
        </p>
        <p className="rounded-md bg-stone px-4 py-3 text-small">Minden ilyen gomb mellett ezt látod: „{DISCLOSURE_TEXT}”</p>
      </LegalSection>
      <LegalSection title="A jutalék nem rangsorol">
        <p>
          A sorrendet kizárólag a te szempontjaid döntik el (egyezés, profilhoz illés, ár-érték, valódi akció, a bolt
          megbízhatósága, az ár frissessége). A jutalék mértéke a rangsorban nem szerepel. A pontos súlyok:{' '}
          <Link href="/igy-rangsorolunk">Így rangsorolunk</Link>.
        </p>
      </LegalSection>
      <LegalSection title="Szponzorált tartalom">
        <p>Fizetett megjelenés csak „Szponzorált” címkével lehetne; jelenleg ilyen nincs a JóVételen.</p>
      </LegalSection>
      <LegalSection title="Partnerhálózatok">
        <p>
          <Fill>a jóváhagyott programok és hálózatok listája (pl. Awin, CJ, Dognet, Admitad)</Fill>
        </p>
      </LegalSection>
      <LegalSection title="Mit látnak a boltok?">
        <p>
          A kattintáskor egy véletlen, személyes adatot nem tartalmazó azonosítót adunk át a hálózatnak, hogy a
          vásárlás elszámolható legyen. Nevedet, e-mail-címedet nem adjuk át.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
