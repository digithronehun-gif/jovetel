import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { requireAdmin } from '@/lib/auth/guards'
import { listGuidesForAdmin } from '@/lib/db/queries/admin/guides'
import { formatRelative } from '@/lib/format/date'
import { createGuideAction } from './actions'

export const metadata: Metadata = { title: 'Útmutatók' }

const ERRORS: Record<string, string> = {
  cim: 'Adj meg egy címet (legfeljebb 120 karakter).',
  foglalt: 'Ilyen URL-nevű útmutató már van: válassz más címet.',
}

export default async function AdminGuidesPage({ searchParams }: { searchParams: Promise<{ hiba?: string }> }) {
  const admin = await requireAdmin()
  const guides = await listGuidesForAdmin(admin.userId)
  const { hiba } = await searchParams
  const now = new Date()
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-m text-ink">Útmutatók</h1>
        <p className="text-small text-ink-muted">
          Szerkesztői válogatások (PRODUCT_SPEC 9.). Indexelhető csak legalább 5 tétellel és 150 szó szerkesztői szöveggel.
        </p>
      </header>

      <form action={createGuideAction} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-end" data-guide-create>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-small text-ink-muted">
          Új útmutató címe
          <Input name="title" required maxLength={120} placeholder="Pl. 10 ajándék anyukáknak 15 ezer alatt" />
        </label>
        <Button type="submit">Létrehozás</Button>
      </form>
      {hiba && ERRORS[hiba] ? (
        <p role="alert" className="text-small text-pricier">
          {ERRORS[hiba]}
        </p>
      ) : null}

      <div className="relative min-w-0 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[40rem] text-left text-small" data-admin-guides>
          <thead className="border-b border-line text-xs text-ink-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Cím</th>
              <th scope="col" className="px-4 py-3 font-semibold">Állapot</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Tételek</th>
              <th scope="col" className="px-4 py-3 font-semibold">Indexelhető</th>
              <th scope="col" className="px-4 py-3 font-semibold">Módosítva</th>
            </tr>
          </thead>
          <tbody>
            {guides.map((g) => (
              <tr key={g.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/utmutatok/${g.id}`} className="font-semibold text-ink underline-offset-2 hover:underline">
                    {g.title}
                  </Link>
                  {g.slug ? <span className="block text-xs text-ink-muted">/utmutatok/{g.slug}</span> : null}
                </td>
                <td className="px-4 py-3">{g.published ? 'Közzétéve' : 'Vázlat'}</td>
                <td className="px-4 py-3 text-right tabular-nums">{g.itemCount}</td>
                <td className="px-4 py-3">{g.isIndexable ? 'igen' : 'nem'}</td>
                <td className="px-4 py-3 text-ink-muted">{formatRelative(g.updatedAt, now)}</td>
              </tr>
            ))}
            {guides.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
                  Még nincs útmutató.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
