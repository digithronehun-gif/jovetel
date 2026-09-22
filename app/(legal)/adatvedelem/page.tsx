import type { Metadata } from 'next'
import Link from 'next/link'
import { Fill, LegalPage, LegalSection } from '@/components/site/LegalPage'

export const metadata: Metadata = {
  title: 'Adatkezelési tájékoztató',
  description: 'Milyen adatokat kezel a JóVétel, milyen célra, meddig, és milyen jogaid vannak.',
  alternates: { canonical: '/adatvedelem' },
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Adatkezelési tájékoztató"
      updated="2026-09-22"
      intro="Röviden: csak azt kezeljük, ami ahhoz kell, hogy jobb ajánlatot és időben emlékeztetőt kapj. Bármikor letöltheted vagy törölheted az adataidat."
    >
      <LegalSection title="1. Az adatkezelő">
        <p>
          Név: <Fill /> · Székhely: <Fill /> · Nyilvántartási szám / cégjegyzékszám: <Fill /> · Adószám: <Fill /> ·
          E-mail: <Fill>adatvédelmi e-mail-cím</Fill>
        </p>
        <p>Adatvédelmi tisztviselő kijelölése nem kötelező; kérdéseidet a fenti e-mail-címen fogadjuk.</p>
      </LegalSection>

      <LegalSection title="2. Milyen adatokat, milyen célra és milyen jogalapon kezelünk">
        <ul>
          <li>
            <strong>Fiók és belépés</strong> (e-mail-cím, belépési azonosítók): a szolgáltatás nyújtása — szerződés
            teljesítése (GDPR 6. cikk (1) b)).
          </li>
          <li>
            <strong>Profil</strong> (keresztnév, bőrtípus, fő gondok, kerülendő összetevők, keret, kedvenc boltok): hogy a
            neked illő termékeket mutassuk — szerződés teljesítése. A bőrprofil kozmetikai ajánláshoz kell, nem
            egészségügyi adat, és nem adunk diagnózist.
          </li>
          <li>
            <strong>Szeretteid adatai</strong> (becenév, keresztnév, kapcsolat, születésnap és névnap napja, érdeklődés,
            keret, megjegyzés): az ajándék-emlékeztetőkhöz. Vezetéknevet és elérhetőséget nem kérünk. Ezek harmadik
            személy adatai: kérjük, csak annyit adj meg, amennyi az emlékeztetőhöz kell; bármikor törölheted őket.
            Jogalap: jogos érdek (6. cikk (1) f)) — <Fill>érdekmérlegelési teszt</Fill>.
          </li>
          <li>
            <strong>Listák, foglalások, árfigyelők, szépségpolc</strong>: a funkciók működéséhez — szerződés
            teljesítése.
          </li>
          <li>
            <strong>Szolgáltatási értesítések</strong> (fontos nap, árcsökkenés, fogyóban lévő termék): hozzájárulás
            (6. cikk (1) a)), külön kapcsolóval, bármikor visszavonható.
          </li>
          <li>
            <strong>Marketing-levél</strong> (heti válogatás): külön hozzájárulás, double opt-in megerősítéssel.
          </li>
          <li>
            <strong>Várólista</strong> (e-mail, érdeklődési kör, honnan érkeztél): hogy szóljunk az indulásról —
            hozzájárulás, double opt-in.
          </li>
          <li>
            <strong>Kattintásnapló</strong> (melyik ajánlatra kattintottál, mikor; az IP-cím csak sózott, visszafejthetetlen
            hash-ként): a partnerprogramok elszámolásához és a visszaélések kiszűréséhez — jogos érdek.
          </li>
          <li>
            <strong>Analitika</strong> (PostHog, EU-szerver): csak a süti-sávon adott hozzájárulás után.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Mesterséges intelligencia">
        <p>
          Az ajándék-tanácsadóba írt szöveget egy mesterséges intelligencia-szolgáltató (<Fill>szolgáltató neve, pl.
          Anthropic</Fill>) dolgozza fel, hogy szűrőkké alakítsa. A nyers szöveget nem tároljuk, csak egy
          visszafejthetetlen lenyomatot és a kinyert szűrőket. Az árakat és a készletet mindig az adatbázisunkból
          mutatjuk, nem az AI-tól.
        </p>
      </LegalSection>

      <LegalSection title="4. Adatfeldolgozók">
        <ul>
          <li>Supabase (adatbázis, belépés) — EU (Frankfurt) régió</li>
          <li>Vercel (tárhely) — EU (Frankfurt) régió</li>
          <li>Resend (e-mail küldés)</li>
          <li>Upstash (túlterhelés elleni védelem)</li>
          <li>Cloudflare Turnstile (bot-védelem)</li>
          <li>PostHog (analitika, EU-szerver) — csak hozzájárulással</li>
          <li>Sentry (hibakövetés)</li>
          <li>
            <Fill>AI-szolgáltató</Fill> (szövegértelmezés)
          </li>
        </ul>
        <p>
          Harmadik országba (az EGT-n kívülre) történő adattovábbításnál az Európai Bizottság általános szerződési
          feltételeit vagy megfelelőségi határozatát alkalmazzuk: <Fill>szolgáltatónként pontosítandó</Fill>.
        </p>
      </LegalSection>

      <LegalSection title="5. Meddig őrizzük">
        <ul>
          <li>Fiókadatok: a fiók törléséig; törléskor azonnal töröljük a felhasználói adatokat.</li>
          <li>Kattintásnapló és alapesemények: 24 hónapig, utána összesítve, személyes adat nélkül.</li>
          <li>AI-kérések naplója (szöveg nélkül): 12 hónap.</li>
          <li>Hozzájárulások naplója: a jogi igazoláshoz szükséges ideig, akkor is, ha a fiókot törölted.</li>
          <li>Megerősítetlen várólista-feliratkozás: <Fill>megőrzési idő</Fill>.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. A jogaid">
        <p>
          Hozzáférés, helyesbítés, törlés, adathordozhatóság (JSON-letöltés a Beállításokban), a kezelés korlátozása,
          tiltakozás, és a hozzájárulás bármikori visszavonása. A fiókodat a Beállításokban egy lépésben törölheted.
        </p>
        <p>
          Panasz: Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH), naih.hu. Bírósághoz is fordulhatsz.
        </p>
      </LegalSection>

      <LegalSection title="7. Sütik">
        <p>
          A sütikről a <Link href="/cookie">süti-tájékoztatóban</Link> olvashatsz; a döntésedet bármikor módosíthatod a
          lábléc „Süti-beállítások” linkjén.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
