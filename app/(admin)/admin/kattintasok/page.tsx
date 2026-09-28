import type { Metadata } from 'next'
import Link from 'next/link'
import { DailyBars } from '@/components/app/admin/DailyBars'
import { Price } from '@/components/app/PriceBlock'
import { cn } from '@/components/ui/cn'
import { CONVERSION_STATUS_LABEL, PLACEMENT_LABEL } from '@/content/labels'
import { requireAdmin } from '@/lib/auth/guards'
import { clickReport, REPORT_RANGES, type ReportRange } from '@/lib/db/queries/admin/clicks'
import { formatDate } from '@/lib/format/date'

export const metadata: Metadata = { title: 'Kattintások' }

const nf = new Intl.NumberFormat('hu-HU')
const pct = new Intl.NumberFormat('hu-HU', { style: 'percent', maximumFractionDigits: 1 })

function Stat({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-4" data-stat>
      <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</span>
      <span className="text-title text-ink tabular-nums">{children}</span>
      {note ? <span className="text-xs text-ink-muted">{note}</span> : null}
    </div>
  )
}

/**
 * Kattintások és konverziók (START_PROMPT F6): napi kattintás (botok nélkül), bolt szerint, konverziók, jutalék, EPC.
 * A jutalék a hálózati szinkronból jön (`pnpm sync:conversions`, naponta 05:00); a rangsorolásban SEHOL nem szerepel.
 */
export default async function AdminClicksPage({ searchParams }: { searchParams: Promise<{ napok?: string }> }) {
  const admin = await requireAdmin()
  const raw = Number((await searchParams).napok)
  const days: ReportRange = (REPORT_RANGES as readonly number[]).includes(raw) ? (raw as ReportRange) : 30
  const r = await clickReport(admin.userId, days)
  const t = r.totals
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-display-m text-ink">Kattintások</h1>
          <p className="text-small text-ink-muted">
            A „Megnézem a boltban” kattintások és a hálózatok konverziói. A botnak jelölt kattintás nem számít bele.
          </p>
        </div>
        <nav aria-label="Időszak" className="flex gap-1">
          {REPORT_RANGES.map((d) => (
            <Link
              key={d}
              href={`/admin/kattintasok?napok=${d}`}
              aria-current={d === days ? 'page' : undefined}
              className={cn(
                'rounded-full border px-3 py-1.5 text-small',
                d === days ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-ink hover:border-ink-subtle',
              )}
            >
              {d} nap
            </Link>
          ))}
        </nav>
      </header>

      <section aria-label="Összesítés" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Kattintás">{nf.format(t.clicks)}</Stat>
        <Stat label="Konverzió" note={t.clicks ? `${pct.format(t.conversions / t.clicks)} a kattintásokból` : undefined}>
          {nf.format(t.conversions)}
        </Stat>
        <Stat label="Függő jutalék">
          <Price huf={t.pendingHuf} />
        </Stat>
        <Stat label="Jóváhagyott jutalék">
          <Price huf={t.approvedHuf} />
        </Stat>
        <Stat label="EPC" note="jutalék / kattintás (függő + jóváhagyott)">
          {t.epcHuf === null ? '–' : <Price huf={t.epcHuf} />}
        </Stat>
      </section>

      <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
        <DailyBars
          title={`Napi kattintás, az elmúlt ${days} nap`}
          unit="Kattintás"
          data={r.daily.map((d) => ({
            day: d.day,
            value: d.clicks,
            detail: `${nf.format(d.clicks)} kattintás · ${nf.format(d.conversions)} konverzió${d.botClicks ? ` · ${nf.format(d.botClicks)} bot` : ''}`,
          }))}
        />
        <p className="mt-3 text-xs text-ink-muted">Bot-kattintás az időszakban: {nf.format(t.botClicks)} (nem számít bele).</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-title text-ink">Bolt szerint</h2>
        <div className="relative min-w-0 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[44rem] text-left text-small" data-admin-merchant-clicks>
            <thead className="border-b border-line text-xs text-ink-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Bolt</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Kattintás</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Konverzió</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Függő</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Jóváhagyott</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Elutasított</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">EPC</th>
              </tr>
            </thead>
            <tbody>
              {r.merchants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-ink-muted">
                    Ebben az időszakban még nem volt kattintás.
                  </td>
                </tr>
              ) : (
                r.merchants.map((m) => (
                  <tr key={m.merchantId} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-3 font-semibold text-ink">{m.merchantName}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{nf.format(m.clicks)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{nf.format(m.conversions)}</td>
                    <td className="px-4 py-3 text-right"><Price huf={m.pendingHuf} className="font-normal" /></td>
                    <td className="px-4 py-3 text-right"><Price huf={m.approvedHuf} className="font-normal" /></td>
                    <td className="px-4 py-3 text-right tabular-nums">{nf.format(m.rejected)}</td>
                    <td className="px-4 py-3 text-right">{m.epcHuf === null ? '–' : <Price huf={m.epcHuf} />}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section className="flex flex-col gap-3">
          <h2 className="text-title text-ink">Hely szerint</h2>
          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface text-small">
            {r.placements.length === 0 ? <li className="px-4 py-3 text-ink-muted">Nincs adat.</li> : null}
            {r.placements.map((p) => (
              <li key={p.placement ?? 'ismeretlen'} className="flex justify-between gap-3 px-4 py-3">
                <span className="text-ink">{p.placement ? (PLACEMENT_LABEL[p.placement] ?? p.placement) : 'Ismeretlen hely'}</span>
                <span className="tabular-nums text-ink">{nf.format(p.clicks)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="text-title text-ink">Legutóbbi konverziók</h2>
          <div className="relative min-w-0 overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[36rem] text-left text-small" data-admin-conversions>
              <thead className="border-b border-line text-xs text-ink-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Időpont</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Bolt</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Állapot</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Kosár</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Jutalék</th>
                </tr>
              </thead>
              <tbody>
                {r.recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-ink-muted">
                      Még nincs konverzió. A szinkron naponta 05:00-kor fut (kulcs nélkül a hálózat kimarad).
                    </td>
                  </tr>
                ) : (
                  r.recent.map((c) => (
                    <tr key={c.id} className="border-b border-line last:border-b-0">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(c.occurredAt, 'short')}</td>
                      <td className="px-4 py-3">
                        {c.merchantName ?? <span className="text-ink-muted">ismeretlen bolt</span>}
                        <span className="ml-1 text-xs text-ink-muted">
                          · {c.networkCode}
                          {c.hasClick ? '' : ' · kattintás nélkül'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{CONVERSION_STATUS_LABEL[c.status]}</td>
                      <td className="px-4 py-3 text-right">{c.orderValueHuf === null ? '–' : <Price huf={c.orderValueHuf} className="font-normal" />}</td>
                      <td className="px-4 py-3 text-right">{c.commissionHuf === null ? '–' : <Price huf={c.commissionHuf} />}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
