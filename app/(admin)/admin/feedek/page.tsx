import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'
import { listFeedsForAdmin } from '@/lib/db/queries/admin/feeds'
import { formatRelative } from '@/lib/format/date'
import { STALE_AFTER_HOURS } from '@/lib/pricing/freshness'
import { StatusBadge } from './StatusBadge'

export const metadata: Metadata = { title: 'Feedek' }

export default async function AdminFeedsPage() {
  const admin = await requireAdmin()
  const feeds = await listFeedsForAdmin(admin.userId)
  const now = new Date()
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-m text-ink">Feedek</h1>
        <p className="text-small text-ink-muted">
          Napi két import (04:00 és 16:00). A {STALE_AFTER_HOURS} óránál régebbi sikeres futás pirossal jelölve.
        </p>
      </header>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[48rem] text-left text-small" data-admin-feeds>
          <thead className="border-b border-line text-xs text-ink-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Kereskedő</th>
              <th scope="col" className="px-4 py-3 font-semibold">Adapter</th>
              <th scope="col" className="px-4 py-3 font-semibold">Utolsó futás</th>
              <th scope="col" className="px-4 py-3 font-semibold">Utolsó sikeres</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Tételek</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Aktív ajánlat</th>
            </tr>
          </thead>
          <tbody>
            {feeds.map((f) => {
              const stale = !f.lastSuccessAt || now.getTime() - f.lastSuccessAt.getTime() > STALE_AFTER_HOURS * 3600e3
              return (
                <tr key={f.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/feedek/${f.id}`} className="font-semibold text-ink underline-offset-2 hover:underline">
                      {f.merchantName}
                    </Link>
                    {!f.isActive ? <span className="ml-2 text-xs text-ink-muted">(kikapcsolva)</span> : null}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {f.adapter} · {f.networkCode}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={f.lastRunStatus} />
                      {f.lastRunAt ? <span className="text-ink-muted">{formatRelative(f.lastRunAt, now)}</span> : null}
                    </span>
                    {f.blockedReason ? <span className="mt-1 block text-xs text-ink-muted">{f.blockedReason}</span> : null}
                  </td>
                  <td className={stale ? 'px-4 py-3 font-semibold text-pricier' : 'px-4 py-3 text-ink'}>
                    {f.lastSuccessAt ? formatRelative(f.lastSuccessAt, now) : 'soha'}
                    {stale ? <span className="sr-only"> (régi)</span> : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{f.lastItemCount ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{f.activeOffers}</td>
                </tr>
              )
            })}
            {feeds.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                  Még nincs feed. Fejlesztésben: <code>pnpm ingest -- --fixtures</code>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
