import type { Metadata } from 'next'
import { Fill, LegalPage, LegalSection } from '@/components/site/LegalPage'

export const metadata: Metadata = { title: 'Impresszum', alternates: { canonical: '/impresszum' } }

export default function ImprintPage() {
  return (
    <LegalPage title="Impresszum" updated="2026-09-22">
      <LegalSection title="Szolgáltató">
        <ul>
          <li>
            Név: <Fill />
          </li>
          <li>
            Székhely: <Fill />
          </li>
          <li>
            Nyilvántartási szám / cégjegyzékszám: <Fill />
          </li>
          <li>
            Adószám: <Fill /> · Közösségi adószám: <Fill />
          </li>
          <li>
            E-mail: <Fill />
          </li>
          <li>
            Nyilvántartó hatóság: <Fill />
          </li>
        </ul>
      </LegalSection>
      <LegalSection title="Tárhelyszolgáltató">
        <p>
          Vercel Inc. — <Fill>a tárhelyszolgáltató címe és elérhetősége az aktuális szerződés szerint</Fill>
        </p>
        <p>Adatbázis: Supabase, EU (Frankfurt) régió.</p>
      </LegalSection>
    </LegalPage>
  )
}
