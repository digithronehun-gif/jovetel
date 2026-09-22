'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import type { PriceHistoryChart as Chart } from './PriceHistoryChart'

const PriceHistoryChart = dynamic(() => import('./PriceHistoryChart').then((m) => m.PriceHistoryChart), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
})

/**
 * A Recharts csak akkor töltődik be, amikor a grafikon a képernyő közelébe ér (a landing
 * betöltési idejét nem terheli). A hely előre le van foglalva, így nincs elrendezés-ugrás.
 */
export function LazyPriceHistoryChart(props: ComponentProps<typeof Chart>) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const height = (props.height ?? 220) + (props.showRangeToggle === false ? 28 : 48)
  return (
    <div ref={ref} style={{ minHeight: height }}>
      {visible ? <PriceHistoryChart {...props} /> : <Skeleton className="w-full" style={{ height }} />}
    </div>
  )
}
