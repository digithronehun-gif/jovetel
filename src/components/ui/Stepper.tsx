import { cn } from './cn'

// „az 5-ből”, „a 4-ből”, „a 6-ból”: névelő és rag a szám kiejtése szerint
const OF_TOTAL: Record<number, string> = {
  1: 'az 1-ből',
  2: 'a 2-ből',
  3: 'a 3-ból',
  4: 'a 4-ből',
  5: 'az 5-ből',
  6: 'a 6-ból',
  7: 'a 7-ből',
  8: 'a 8-ból',
  9: 'a 9-ből',
  10: 'a 10-ből',
}

/** Lépésjelző (onboarding, varázsló): „2. lépés az 5-ből”, sávokkal. */
export function Stepper({
  current,
  total,
  labels,
  className,
}: {
  /** 1-től számolva */
  current: number
  total: number
  labels?: string[]
  className?: string
}) {
  const label = labels?.[current - 1]
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="text-small text-ink-muted">
        <span className="text-ink">{current}. lépés</span> {OF_TOTAL[total] ?? `/ ${total}`}
        {label ? <span className="text-ink-muted"> · {label}</span> : null}
      </p>
      <ol className="flex gap-1.5" aria-label="Lépések">
        {Array.from({ length: total }, (_, i) => {
          const step = i + 1
          const state = step < current ? 'kész' : step === current ? 'aktuális' : 'hátravan'
          return (
            <li
              key={step}
              aria-current={step === current ? 'step' : undefined}
              aria-label={`${step}. lépés${labels?.[i] ? `: ${labels[i]}` : ''} (${state})`}
              className={cn(
                'h-1.5 flex-1 rounded-full',
                step < current && 'bg-ink',
                step === current && 'bg-amber',
                step > current && 'bg-line',
              )}
            />
          )
        })}
      </ol>
    </div>
  )
}
