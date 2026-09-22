'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { EventName, EventProps } from '@/lib/analytics/events'
import { sanitizeProps } from '@/lib/analytics/events'
import { saveCookieConsent } from '@/app/actions/consent'

export interface ConsentState {
  analytics: boolean
  marketing: boolean
}

interface ConsentApi {
  /** null: még nem döntött (a sáv látszik) */
  consent: ConsentState | null
  decide: (c: ConsentState) => Promise<void>
  openSettings: () => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  track: (name: EventName, props?: EventProps) => void
}

const Ctx = createContext<ConsentApi | null>(null)

type PostHogLike = { capture: (name: string, props?: Record<string, unknown>) => void; opt_out_capturing: () => void }

/**
 * A hozzájárulás állapota és a PostHog-kapu: a posthog-js CSAK analitika-hozzájárulás után töltődik be
 * (dinamikus import), előtte egyetlen hálózati kérés sem megy a PostHog felé.
 */
export function ConsentProvider({ initial, children }: { initial: ConsentState | null; children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentState | null>(initial)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const posthog = useRef<PostHogLike | null>(null)
  const queue = useRef<[EventName, EventProps | undefined][]>([])

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!consent?.analytics || !key || posthog.current) {
      if (!consent?.analytics && posthog.current) posthog.current.opt_out_capturing()
      return
    }
    let cancelled = false
    void import('posthog-js').then(({ default: ph }) => {
      if (cancelled) return
      ph.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: true,
        autocapture: false,
        disable_session_recording: true,
        disable_surveys: true,
        persistence: 'localStorage+cookie',
        ip: false,
      })
      posthog.current = ph
      for (const [n, p] of queue.current) ph.capture(n, sanitizeProps(p))
      queue.current = []
    })
    return () => {
      cancelled = true
    }
  }, [consent?.analytics])

  const decide = useCallback(async (c: ConsentState) => {
    setConsent(c)
    setSettingsOpen(false)
    await saveCookieConsent(c)
  }, [])

  const track = useCallback(
    (name: EventName, props?: EventProps) => {
      if (!consent?.analytics) return // hozzájárulás nélkül nincs analitika
      if (posthog.current) posthog.current.capture(name, sanitizeProps(props))
      else queue.current.push([name, props])
    },
    [consent?.analytics],
  )

  const api = useMemo<ConsentApi>(
    () => ({ consent, decide, openSettings: () => setSettingsOpen(true), settingsOpen, setSettingsOpen, track }),
    [consent, decide, settingsOpen, track],
  )
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useConsent(): ConsentApi {
  const c = useContext(Ctx)
  if (!c) throw new Error('A useConsent csak ConsentProvider-en belül használható.')
  return c
}

/** Kényelmi hook: esemény küldése (consent-kapuval). */
export function useTrack() {
  return useConsent().track
}
