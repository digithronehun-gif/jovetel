import { cn } from '@/components/ui/cn'

// Determinisztikus levél-elrendezés (nem kép, generált SVG — DESIGN_SYSTEM 5.2)
const LEAVES: ReadonlyArray<readonly [x: number, y: number, rot: number, scale: number]> = [
  [120, 80, -32, 1.1],
  [210, 150, 18, 0.9],
  [60, 210, 64, 0.8],
  [300, 60, -70, 1.25],
  [360, 190, 40, 1],
  [170, 290, -12, 1.2],
  [420, 300, 75, 0.85],
  [520, 120, -45, 1.15],
  [600, 240, 22, 0.95],
  [470, 40, 10, 0.7],
  [680, 90, -60, 1.05],
  [260, 380, 55, 0.9],
]

function Leaf({ x, y, rot, scale }: { x: number; y: number; rot: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <path d="M0 -46 C 22 -30, 24 18, 0 46 C -24 18, -22 -30, 0 -46 Z" />
      <path d="M0 46 L 0 78" strokeWidth="4" stroke="currentColor" />
    </g>
  )
}

/** Finom, elmosott levélárnyék a szekciók hátterén és az üres állapotokon. */
export function LeafShadow({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      data-leaf-shadow
      viewBox="0 0 760 440"
      preserveAspectRatio="xMidYMid slice"
      className={cn('pointer-events-none absolute inset-0 h-full w-full text-ink', className)}
      style={{ opacity: 'var(--leaf-opacity)' }}
    >
      <defs>
        <filter id="leaf-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <g fill="currentColor" filter="url(#leaf-blur)">
        {LEAVES.map(([x, y, rot, scale], i) => (
          <Leaf key={i} x={x} y={y} rot={rot} scale={scale} />
        ))}
      </g>
    </svg>
  )
}
