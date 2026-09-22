import type { Metadata } from 'next'
import { ConsentSettingsLink } from '@/components/consent/ConsentBanner'
import { LegalPage, LegalSection } from '@/components/site/LegalPage'

export const metadata: Metadata = { title: 'Süti-tájékoztató', alternates: { canonical: '/cookie' } }

const COOKIES = [
  { name: 'jv_consent', cat: 'Szükséges', purpose: 'A süti-döntésed megjegyzése.', ttl: '180 nap' },
  { name: 'jv_anon', cat: 'Szükséges', purpose: 'Névtelen azonosító a hozzájárulásod igazolásához (a döntéskor jön létre).', ttl: '1 év' },
  { name: 'sb-…-auth-token', cat: 'Szükséges', purpose: 'Belépve tartás (Supabase).', ttl: 'a munkamenet végéig / legfeljebb 1 év' },
  { name: 'ph_…', cat: 'Analitika', purpose: 'Névtelen használati statisztika (PostHog, EU). Csak hozzájárulással.', ttl: '1 év' },
] as const

export default function CookiePage() {
  return (
    <LegalPage title="Süti-tájékoztató" updated="2026-09-22" intro="Mérésre és marketingre csak a beleegyezéseddel használunk sütit.">
      <LegalSection title="Kategóriák">
        <ul>
          <li>
            <strong>Szükséges</strong>: nélkülük az oldal nem működik (belépés, biztonság, a döntésed megjegyzése).
            Ezekhez nem kell hozzájárulás.
          </li>
          <li>
            <strong>Analitika</strong>: névtelen statisztika arról, mi hasznos. Csak hozzájárulással töltjük be a mérőkódot.
          </li>
          <li>
            <strong>Marketing</strong>: a kampányaink mérése. Jelenleg ilyen sütit nem használunk; ha bevezetjük, csak
            hozzájárulással.
          </li>
        </ul>
      </LegalSection>
      <LegalSection title="A sütik listája">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-small">
            <thead>
              <tr className="border-b border-line text-ink-muted">
                <th className="py-2 pr-4 font-semibold">Név</th>
                <th className="py-2 pr-4 font-semibold">Kategória</th>
                <th className="py-2 pr-4 font-semibold">Cél</th>
                <th className="py-2 font-semibold">Élettartam</th>
              </tr>
            </thead>
            <tbody>
              {COOKIES.map((c) => (
                <tr key={c.name} className="border-b border-line align-top">
                  <td className="py-2 pr-4 font-semibold">{c.name}</td>
                  <td className="py-2 pr-4">{c.cat}</td>
                  <td className="py-2 pr-4 font-normal">{c.purpose}</td>
                  <td className="py-2 font-normal">{c.ttl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-small text-ink-muted">
          A bot-védelem (Cloudflare Turnstile) a várólista- és a foglalási űrlapon fut; a böngésző jellemzőiből ellenőrzi,
          hogy nem gép próbálkozik.
        </p>
      </LegalSection>
      <LegalSection title="A döntésed módosítása">
        <ConsentSettingsLink className="w-fit rounded-full border border-line bg-surface px-4 py-2 text-small font-semibold text-ink hover:border-ink-subtle" />
      </LegalSection>
    </LegalPage>
  )
}
