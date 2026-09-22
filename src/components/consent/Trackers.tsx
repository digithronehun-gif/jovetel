'use client'

import { useEffect } from 'react'
import type { EventName, EventProps } from '@/lib/analytics/events'
import { useConsent } from './ConsentProvider'

/** Oldalmegtekintés-esemény (pl. landing_view) — csak hozzájárulás után megy ki. */
export function TrackView({ name, props }: { name: EventName; props?: EventProps }) {
  const { track, consent } = useConsent()
  useEffect(() => {
    track(name, props)
    // a hozzájárulás megadásakor is elküldjük egyszer
  }, [consent?.analytics]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

/** `data-cta="hely"` attribútumú gombok kattintása → cta_click{hely} (PRODUCT_SPEC 11. pont). */
export function CtaClickTracker() {
  const { track } = useConsent()
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-cta]')
      if (el?.dataset.cta) track('cta_click', { hely: el.dataset.cta })
    }
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [track])
  return null
}
