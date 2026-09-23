import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { getFeedDetailForAdmin } from '@/lib/db/queries/admin/feeds'
import { formatDate, formatRelative } from '@/lib/format/date'
import { RunNowButton } from '../RunNowButton'
import { StatusBadge } from '../StatusBadge'

export const metadata: Metadata = { title: 'Feed' }

const REASON_LABEL: Record<string, string> = {
  missing_field: 'Hiányzó mező',
  invalid_price: 'Érvénytelen ár',
  currency: 'Nem forint',
  encoding: 'Hibás kódolás',
  invalid_url: 'Érvénytelen URL',
  url_not_allowed: 'Idegen domain',
  too_long: 'Túl hosszú',
  duplicate_sku: 'Ismétlődő cikkszám',
  parse_error: 'Olvasási hiba',
  failed: 'Futási hiba',
}

export default async function AdminFeedPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()
  const detail = await getFeedDetailForAdmin(admin.userId, id)
  if (!detail) notFound()
  const { feed, runs } = detail
  const last = runs[0]
  const stats = (last?.stats ?? {}) as { unmappedCategories?: [string, number][]; flags?: Record<string, number>; durationMs?: number }
  const now = new Date()

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link href="/admin/feedek" className="text-small text-ink-muted hover:text-ink">
            ← Feedek
          </Link>
          <h1 className="text-display-m text-ink">{feed.merchantName}</h1>
          <p className="text-small text-ink-muted">
            {feed.adapter} · {feed.format} · {feed.networkCode} · utolsó sikeres: {feed.lastSuccessAt ? formatRelative(feed.lastSuccessAt, now) : 'soha'}
          </p>
        </div>
        <RunNowButton feedId={feed.id} disabled={!feed.isActive} />
      </header>

      {last ? (
        <section aria-labelledby="utolso" className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
          <h2 id="utolso" className="text-title text-ink">
            Utolsó futás <StatusBadge status={last.status} />
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-small sm:grid-cols-5">
            {[
              ['Látott', last.itemsSeen],
              ['Érvényes', last.itemsValid],
              ['Változott', last.itemsChanged],
              ['Elutasított', last.itemsRejected],
              ['Idő', stats.durationMs != null ? `${(stats.durationMs / 1000).toFixed(1)} s` : '—'],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex flex-col">
                <dt className="text-xs text-ink-muted">{k}</dt>
                <dd className="text-title text-ink tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          {last.blockedReason ? <p className="rounded-md bg-peach px-3 py-2 text-small text-ink">{last.blockedReason}</p> : null}
          {stats.flags?.prompt_injection ? (
            <p className="text-small text-ink-muted">
              Utasításszerű szöveg {stats.flags.prompt_injection} tétel leírásában (adatként tároltuk, az AI csak határolók között kapja).
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <h3 className="text-small font-bold text-ink">Hibaminta ({last.errorSample.length})</h3>
            {last.errorSample.length ? (
              <ul className="flex flex-col divide-y divide-line rounded-md border border-line text-small" data-error-sample>
                {last.errorSample.map((e, i) => (
                  <li key={i} className="flex flex-wrap gap-x-3 px-3 py-2">
                    <span className="font-semibold text-ink">{REASON_LABEL[e.reason] ?? e.reason}</span>
                    {e.field ? <span className="text-ink-muted">mező: {e.field}</span> : null}
                    {e.sku ? <span className="text-ink-muted">cikkszám: {e.sku}</span> : null}
                    {e.detail ? <span className="text-ink-muted">{e.detail}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-small text-ink-muted">Nincs elutasított sor.</p>
            )}
          </div>

          {stats.unmappedCategories?.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-small font-bold text-ink">Leképezetlen kategóriák</h3>
              <ul className="flex flex-wrap gap-2 text-small">
                {stats.unmappedCategories.map(([c, n]) => (
                  <li key={c} className="rounded-full border border-line px-3 py-1 text-ink">
                    {c} <span className="text-ink-muted">({n})</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="futasok" className="flex flex-col gap-3">
        <h2 id="futasok" className="text-title text-ink">
          Futások
        </h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[40rem] text-left text-small" data-admin-runs>
            <thead className="border-b border-line text-xs text-ink-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Indult</th>
                <th scope="col" className="px-4 py-3 font-semibold">Állapot</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Látott</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Érvényes</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Változott</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Elutasított</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-2.5 text-ink">{formatDate(r.startedAt, 'dateTime')}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.itemsSeen}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.itemsValid}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.itemsChanged}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.itemsRejected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
