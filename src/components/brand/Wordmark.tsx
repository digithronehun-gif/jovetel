import { cn } from '@/components/ui/cn'
import { MONOGRAM, WORDMARK } from './glyphs.generated'

/**
 * „JóVétel” szóvédjegy (DESIGN_SYSTEM 5.4): Bodoni Moda 500, az „ó” ékezete egy borostyán
 * fénysugár. A betűk `currentColor`-t, a sugár `--amber`-t használ.
 */
export function Wordmark({ className, title = 'JóVétel' }: { className?: string; title?: string }) {
  const { width, capHeight, descent, path, ray } = WORDMARK
  const top = 40
  const vbHeight = capHeight + descent + top
  return (
    <svg
      viewBox={`0 ${-top} ${width} ${vbHeight}`}
      role="img"
      aria-label={title}
      className={cn('h-7 w-auto', className)}
      data-wordmark
    >
      <title>{title}</title>
      <path d={path} fill="currentColor" />
      <line
        x1={ray.x1}
        y1={ray.y1}
        x2={ray.x2}
        y2={ray.y2}
        stroke="var(--amber)"
        strokeWidth={ray.width}
        strokeLinecap="round"
      />
    </svg>
  )
}

/** „J” monogram fénysugárral: favicon, app-ikon, értesítés-ikon. */
export function Monogram({
  className,
  title = 'JóVétel',
  framed = false,
}: {
  className?: string
  title?: string
  framed?: boolean
}) {
  const { path, ray } = MONOGRAM
  // A J (38–962 × 0–1561) és a jobb felső sugár köré négyzetes vászon
  const vb = framed ? '-420 -640 2000 2000' : '-120 -500 1500 2100'
  return (
    <svg
      viewBox={vb}
      role="img"
      aria-label={title}
      className={cn('h-8 w-8', className)}
      data-monogram
    >
      <title>{title}</title>
      {framed ? (
        <rect x="-420" y="-640" width="2000" height="2000" rx="440" fill="var(--peach)" />
      ) : null}
      <path d={path} fill="currentColor" />
      <line
        x1={ray.x1}
        y1={ray.y1}
        x2={ray.x2}
        y2={ray.y2}
        stroke="var(--amber)"
        strokeWidth={ray.width}
        strokeLinecap="round"
      />
    </svg>
  )
}
