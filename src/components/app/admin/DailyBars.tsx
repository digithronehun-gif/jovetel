import { cn } from '@/components/ui/cn'
import { formatMonthDay } from '@/lib/format/date'

export interface DailyBar {
  /** YYYY-MM-DD */
  day: string
  value: number
  /** a tooltip és a képernyőolvasó szövege, pl. „41 kattintás · 1 konverzió” */
  detail: string
}

const nf = new Intl.NumberFormat('hu-HU')

function niceMax(v: number): number {
  if (v <= 4) return 4
  const pow = 10 ** Math.floor(Math.log10(v))
  const step = [1, 2, 2.5, 5, 10].map((s) => s * pow).find((s) => v <= s * 4)!
  return step * 4
}

const shortDay = (d: string) => formatMonthDay(Number(d.slice(5, 7)), Number(d.slice(8, 10)), 'short')

/**
 * Napi oszlopdiagram egy adatsorral (dataviz: egy sor → nincs jelmagyarázat, a cím mondja meg, mi látszik).
 * Oszlop ≤ 24 px, 4 px lekerekítés a végén, 2 px rés, halvány rácsvonal; a hover/fókusz-címke az egész oszlopsávon
 * él (nagyobb célfelület, mint a jel). Szín: `--chart-bar` (a validátorral ellenőrzött lépés, világos és sötét módban).
 * A táblázatnézet a diagram alatt, lenyitható.
 */
export function DailyBars({ data, title, unit }: { data: DailyBar[]; title: string; unit: string }) {
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const ticks = [max, max / 2, 0]
  const labelIdx = new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])
  return (
    <figure className="flex flex-col gap-3" data-daily-bars>
      <figcaption className="text-body font-semibold text-ink">{title}</figcaption>
      <div className="flex gap-2">
        <div className="flex h-40 flex-col justify-between text-right text-xs text-ink-muted tabular-nums" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
              {nf.format(t)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden>
            {ticks.map((t) => (
              <div key={t} className="border-t border-line" />
            ))}
          </div>
          <ol className="relative flex h-40 items-end gap-[2px]" aria-label={title}>
            {data.map((d) => (
              <li key={d.day} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
                <span
                  tabIndex={0}
                  aria-label={`${shortDay(d.day)}: ${d.detail}`}
                  className="flex h-full w-full items-end justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-amber-deep"
                >
                  <span
                    className="block w-full max-w-6 rounded-t-[4px] bg-chart-bar"
                    style={{ height: d.value > 0 ? `max(2px, ${(d.value / max) * 100}%)` : 0 }}
                  />
                </span>
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-sm border border-line bg-surface px-2 py-1 text-xs whitespace-nowrap text-ink shadow-soft group-focus-within:block group-hover:block"
                >
                  <strong>{shortDay(d.day)}</strong> · {d.detail}
                </span>
              </li>
            ))}
          </ol>
          {/* csak az első, a középső és az utolsó nap felirata; a szélsők a szélhez igazodnak, így nem lógnak ki */}
          <div className="relative mt-1 h-4 text-xs whitespace-nowrap text-ink-muted" aria-hidden>
            {[...labelIdx].map((i) => (
              <span
                key={i}
                className={cn('absolute top-0', i === 0 ? 'left-0' : i === data.length - 1 ? 'right-0' : '-translate-x-1/2')}
                style={i !== 0 && i !== data.length - 1 ? { left: `${((i + 0.5) / data.length) * 100}%` } : undefined}
              >
                {shortDay(data[i]!.day)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <details className="text-small">
        <summary className="cursor-pointer text-ink-muted">Táblázatként</summary>
        <table className="mt-2 w-full max-w-md text-left">
          <thead className="text-xs text-ink-muted uppercase">
            <tr>
              <th scope="col" className="py-1 font-semibold">Nap</th>
              <th scope="col" className="py-1 text-right font-semibold">{unit}</th>
              <th scope="col" className="py-1 pl-4 font-semibold">Részletek</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day} className="border-t border-line">
                <td className="py-1">{shortDay(d.day)}</td>
                <td className="py-1 text-right tabular-nums">{nf.format(d.value)}</td>
                <td className="py-1 pl-4 text-ink-muted">{d.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
