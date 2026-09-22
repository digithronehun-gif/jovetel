import type { Metadata } from 'next'
import Link from 'next/link'
import { Fill, LegalPage, LegalSection } from '@/components/site/LegalPage'

export const metadata: Metadata = {
  title: 'Általános szerződési feltételek',
  alternates: { canonical: '/aszf' },
}

export default function TermsPage() {
  return (
    <LegalPage title="Általános szerződési feltételek" updated="2026-09-22">
      <LegalSection title="1. A szolgáltató">
        <p>
          <Fill>cégnév</Fill>, székhely: <Fill />, nyilvántartási szám: <Fill />, adószám: <Fill />, e-mail: <Fill />.
        </p>
      </LegalSection>
      <LegalSection title="2. A szolgáltatás">
        <p>
          A JóVétel ingyenes, személyes vásárlási segítő: magyar webshopok termékeit és árait mutatja, emlékeztet a
          szeretteid fontos napjaira, figyeli az árakat és a szépségpolcod termékeit. A JóVétel nem webáruház: nálunk
          nem lehet vásárolni, és nem vagyunk fél a te és a bolt közötti adásvételben.
        </p>
      </LegalSection>
      <LegalSection title="3. Árak és adatok">
        <p>
          Az árakat, a szállítási díjat és a készletet a partnerboltok hivatalos termékadataiból vesszük át, és minden
          árnál jelezzük, mikor ellenőriztük. A bolt oldalán a vásárlás pillanatában érvényes ár és feltétel az
          irányadó. A „Valódi akció” ítélet a saját napi ármérésünkből készül; tájékoztató jellegű.
        </p>
      </LegalSection>
      <LegalSection title="4. Partnerlinkek">
        <p>
          A boltokba vivő gombok partnerlinkek: ha vásárolsz, jutalékot kaphatunk. Ez neked semmibe nem kerül, és nem
          befolyásolja a sorrendet. Részletek: <Link href="/affiliate-tajekoztato">affiliate-tájékoztató</Link>,{' '}
          <Link href="/igy-rangsorolunk">így rangsorolunk</Link>.
        </p>
      </LegalSection>
      <LegalSection title="5. Mesterséges intelligencia">
        <p>
          Az ajándék-tanácsadó mesterséges intelligenciát használ a kérdésed értelmezésére és a javaslatok rövid
          indoklására. Az AI nem forrása az áraknak és a termékadatoknak. Az indoklás tájékoztató jellegű.
        </p>
      </LegalSection>
      <LegalSection title="6. Bőrápolás">
        <p>Az ajánlások kozmetikai jellegűek, nem orvosi tanácsok. Bőrproblémával fordulj bőrgyógyászhoz.</p>
      </LegalSection>
      <LegalSection title="7. Fiók, megszűnés">
        <p>
          A fiókodat bármikor törölheted a Beállításokban. Visszaélés (pl. automatizált tömeges lekérdezés) esetén a
          hozzáférést korlátozhatjuk.
        </p>
      </LegalSection>
      <LegalSection title="8. Felelősség">
        <p>
          <Fill>felelősségkorlátozás ügyvéddel egyeztetve</Fill>
        </p>
      </LegalSection>
      <LegalSection title="9. Irányadó jog, panasz">
        <p>
          A magyar jog az irányadó. Panaszodat a fenti e-mail-címen fogadjuk; <Fill>békéltető testület</Fill>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
