'use client'

import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { cn } from '@/components/ui/cn'
import { formatDate } from '@/lib/format/date'
import { formatHufAxis } from '@/lib/pricing/format'
import { Price } from './PriceBlock'

export interface PricePoint {
  /** YYYY-MM-DD */
  day: string
  priceHuf: number
}

export interface PriceSeries {
  merchantName: string
  points: PricePoint[]
}

// Szövegszín-tokenek: jól elkülönülnek, és a sötét módban is olvashatók
const SERIES_COLORS = ['var(--ink)', 'var(--sky-deep)', 'var(--amber-deep)', 'var(--ink-muted)']

/** „Kerek” y-tengely: 500/1000/2000/5000 Ft-os lépésköz, 3–5 osztás, a tartomány a lépésköz többszöröse. */
export function priceAxis(lo: number, hi: number): { domain: [number, number]; ticks: number[] } {
  const span = Math.max(hi - lo, 1)
  const step = [250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 50000].find((s) => span / s <= 4) ?? 100000
  const min = Math.max(0, Math.floor(lo / step) * step - (lo % step === 0 ? step : 0))
  let max = Math.ceil(hi / step) * step + (hi % step === 0 ? step : 0)
  while ((max - min) / step < 2) max += step
  const ticks: number[] = []
  for (let v = min; v <= max; v += step) ticks.push(v)
  return { domain: [min, max], ticks }
}


function ChartTooltip({ active, payload, label }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-small shadow-soft">
      <p className="text-xs text-ink-muted">{formatDate(`${label}T12:00:00Z`)}</p>
      {payload.map((p) =>
        typeof p.value === 'number' ? (
          <p key={String(p.dataKey)} className="flex items-center gap-2 text-ink">
            <span aria-hidden className="size-2 rounded-full" style={{ background: p.color }} />
            <span className="text-ink-muted">{p.name}:</span> <Price huf={p.value} />
          </p>
        ) : null,
      )}
    </div>
  )
}

/**
 * Ártörténet (DESIGN_SYSTEM 6. pont): Recharts vonal, 30/90 nap, --ink vonal, --amber pont a jelenlegi
 * áron, halvány rács, tooltip dátummal és árral, a 30 napos minimum szaggatott vonallal. Boltonként egy vonal.
 */
export function PriceHistoryChart({
  series,
  min30Huf,
  currentHuf,
  defaultRange = 30,
  showRangeToggle = true,
  height = 220,
  className,
  title = 'Ártörténet',
}: {
  series: PriceSeries[]
  min30Huf?: number | null
  currentHuf?: number | null
  defaultRange?: 30 | 90
  showRangeToggle?: boolean
  height?: number
  className?: string
  title?: string
}) {
  const [range, setRange] = useState<30 | 90>(defaultRange)

  const data = useMemo(() => {
    const days = new Set<string>()
    for (const s of series) for (const p of s.points) days.add(p.day)
    const sorted = [...days].sort().slice(-range)
    const cutoff = sorted[0]
    return sorted.map((day) => {
      const row: Record<string, string | number | null> = { day }
      series.forEach((s, i) => {
        const pt = s.points.find((p) => p.day === day && (!cutoff || p.day >= cutoff))
        row[`s${i}`] = pt ? pt.priceHuf : null
      })
      return row
    })
  }, [series, range])

  const last = data.at(-1)
  const values = data.flatMap((r) => series.map((_, i) => r[`s${i}`])).filter((v): v is number => typeof v === 'number')
  const axis = priceAxis(Math.min(...values, min30Huf ?? Infinity), Math.max(...values))

  return (
    <figure className={cn('flex flex-col gap-3', className)} data-price-history>
      <div className="flex items-center justify-between gap-3">
        <figcaption className="text-small text-ink">{title}</figcaption>
        {showRangeToggle ? (
          <div role="group" aria-label="Időszak" className="inline-flex rounded-full bg-stone p-1">
            {([30, 90] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={cn(
                  'min-h-9 rounded-full px-3 text-xs font-semibold transition-colors',
                  range === r ? 'bg-surface text-ink shadow-soft' : 'text-ink-muted hover:text-ink',
                )}
              >
                {r} nap
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{ height }} role="img" aria-label={`${title}, az elmúlt ${range} nap napi árai boltonként`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeOpacity={0.6} vertical={false} />
            <XAxis
              dataKey="day"
              tickFormatter={(d: string) => formatDate(`${d}T12:00:00Z`, 'monthDayShort')}
              tick={{ fill: 'var(--ink-muted)', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis
              domain={axis.domain}
              ticks={axis.ticks}
              tickFormatter={formatHufAxis}
              tick={{ fill: 'var(--ink-muted)', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip content={(p) => <ChartTooltip {...(p as TooltipContentProps<number, string>)} />} />
            {min30Huf ? (
              <ReferenceLine
                y={min30Huf}
                stroke="var(--deal)"
                strokeDasharray="5 5"
                label={{ value: '30 napos minimum', position: 'insideBottomLeft', fill: 'var(--deal)', fontSize: 11 }}
              />
            ) : null}
            {series.map((s, i) => (
              <Line
                key={s.merchantName}
                type="stepAfter"
                dataKey={`s${i}`}
                name={s.merchantName}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={i === 0 ? 2.25 : 1.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
            {currentHuf && last ? (
              <ReferenceDot x={String(last.day)} y={currentHuf} r={5} fill="var(--amber)" stroke="var(--surface)" strokeWidth={2} />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {series.length > 1 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
          {series.map((s, i) => (
            <li key={s.merchantName} className="flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
              {s.merchantName}
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  )
}
