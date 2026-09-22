import { cn } from '@/components/ui/cn'

/**
 * Fénysáv (DESIGN_SYSTEM 5.1): két egymásra tett radiális átmenet (--amber 35%, --peach 25%),
 * képen `soft-light`, papíron `multiply` keveréssel. 18 mp-es lassú vándorlás;
 * `prefers-reduced-motion` esetén statikus (a globals.css kikapcsolja az animációt).
 */
export function LightLeak({
  surface = 'image',
  animated = true,
  className,
}: {
  surface?: 'image' | 'paper'
  animated?: boolean
  className?: string
}) {
  return (
    <div
      aria-hidden
      data-light-leak
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        surface === 'image' ? 'mix-blend-soft-light' : 'mix-blend-multiply dark:mix-blend-screen',
        className,
      )}
    >
      <div
        className={cn('absolute -inset-1/4', animated && 'animate-light-drift')}
        style={{
          background: [
            'radial-gradient(40% 55% at 70% 30%, color-mix(in oklab, var(--amber) 35%, transparent) 0%, transparent 70%)',
            'radial-gradient(45% 50% at 30% 65%, color-mix(in oklab, var(--peach) 25%, transparent) 0%, transparent 75%)',
          ].join(','),
        }}
      />
    </div>
  )
}
