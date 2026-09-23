import type { Metadata } from 'next'
import { requireAdminWithoutMfa } from '@/lib/auth/guards'

export const metadata: Metadata = { title: 'Kétlépcsős azonosítás' }

/** Admin MFA nélkül ide kerül. A TOTP-regisztráció felülete a belépéssel együtt készül (F7). */
export default async function AdminMfaPage() {
  await requireAdminWithoutMfa()
  return (
    <div className="mx-auto flex max-w-prose flex-col gap-4">
      <h1 className="text-display-m text-ink">Kétlépcsős azonosítás szükséges</h1>
      <p className="text-body text-ink-muted">
        Az admin felülethez hitelesítő alkalmazással (TOTP) igazolt belépés kell. A beállítás felülete a belépés
        oldalával együtt készül el; addig a fiókhoz a Supabase felületén vehető fel tényező.
      </p>
    </div>
  )
}
