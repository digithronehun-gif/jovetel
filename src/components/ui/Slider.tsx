'use client'

import { Slider as SliderPrimitive } from 'radix-ui'
import { cn } from './cn'

/**
 * Sávos csúszka (keret-választás): diszkrét lépések címkével. A címkéket a hívó adja
 * (pénzösszegnél a PriceBlock `Price` komponensével formázva).
 */
export function Slider({
  steps,
  value,
  onValueChange,
  label,
  valueText,
  className,
}: {
  steps: { value: number; label: string }[]
  value: number
  onValueChange: (v: number) => void
  label: string
  /** képernyőolvasónak felolvasott aktuális érték, pl. „15 000 forint” */
  valueText?: string
  className?: string
}) {
  const index = Math.max(
    0,
    steps.findIndex((s) => s.value === value),
  )
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <SliderPrimitive.Root
        min={0}
        max={steps.length - 1}
        step={1}
        value={[index]}
        onValueChange={(v) => {
          const s = steps[v[0] ?? 0]
          if (s) onValueChange(s.value)
        }}
        className="relative flex h-11 w-full touch-none items-center select-none"
      >
        <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-line">
          <SliderPrimitive.Range className="absolute h-full bg-ink" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label={label}
          aria-valuetext={valueText ?? steps[index]?.label}
          className="block size-7 rounded-full border-2 border-ink bg-surface shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep"
        />
      </SliderPrimitive.Root>
      <div className="flex justify-between text-small text-ink-muted" aria-hidden>
        {steps.map((s, i) => (
          <span key={s.value} className={cn(i === index && 'text-ink')}>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
