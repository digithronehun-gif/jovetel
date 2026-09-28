'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useConsent } from './ConsentProvider'

// A kapcsolók (Radix Switch) csak a „Beállítások” megnyitásakor töltődnek le: az első betöltésből kimaradnak.
const ConsentSwitches = dynamic(() => import('./ConsentSwitches').then((m) => m.ConsentSwitches), {
  ssr: false,
  loading: () => <div className="mt-3 h-48 border-y border-line" aria-hidden />,
})

/**
 * Süti- és hozzájárulás-sáv (PRODUCT_SPEC F2): szükséges · analitika · marketing. Az elutasítás ugyanolyan
 * hangsúlyos, mint az elfogadás; döntés előtt nincs analitika.
 */
export function ConsentBanner() {
  const { consent, decide, settingsOpen, setSettingsOpen } = useConsent()
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false)
  const [marketing, setMarketing] = useState(consent?.marketing ?? false)
  const [busy, setBusy] = useState(false)

  if (consent && !settingsOpen) return null

  const choose = async (c: { analytics: boolean; marketing: boolean }) => {
    setBusy(true)
    try {
      await decide(c)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      data-consent-banner
      className="fixed inset-x-2 bottom-2 z-[70] mx-auto max-w-2xl rounded-lg border border-line bg-surface p-3.5 shadow-lift sm:inset-x-6 sm:bottom-6 sm:rounded-xl sm:p-5"
    >
      <h2 id="consent-title" className="sr-only text-body font-bold text-ink sm:not-sr-only">
        Sütik a JóVételen
      </h2>
      <p className="text-small font-normal text-ink-muted sm:mt-1.5">
        <span className="sm:hidden">Mérésre csak a beleegyezéseddel használunk sütit. </span>
        <span className="hidden sm:inline">
          A szükséges sütik nélkül az oldal nem működik. Az analitikai sütikkel mérjük, mi hasznos; a
          marketing sütik a kampányaink méréséhez kellenek. Te döntöd el, mit engedsz.{' '}
        </span>
        {settingsOpen ? null : (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="font-semibold text-amber-deep underline-offset-4 hover:underline sm:hidden"
          >
            Beállítások
          </button>
        )}
        <span className="sm:hidden"> · </span>
        <Link href="/cookie" className="text-amber-deep underline underline-offset-4 hover:text-ink">
          Süti-tájékoztató
        </Link>
      </p>

      {settingsOpen ? (
        <ConsentSwitches analytics={analytics} marketing={marketing} onAnalytics={setAnalytics} onMarketing={setMarketing} />
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:flex sm:flex-wrap sm:justify-end">
        {settingsOpen ? (
          <Button variant="primary" size="sm" disabled={busy} onClick={() => choose({ analytics, marketing })} className="col-span-2">
            Kiválasztottak mentése
          </Button>
        ) : (
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => setSettingsOpen(true)} className="hidden sm:inline-flex">
            Beállítások
          </Button>
        )}
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => choose({ analytics: false, marketing: false })}>
          Csak a szükségesek
        </Button>
        <Button variant="primary" size="sm" disabled={busy} onClick={() => choose({ analytics: true, marketing: true })}>
          Mindet elfogadom
        </Button>
      </div>
    </div>
  )
}

/** Lábléc-link a döntés módosításához. */
export function ConsentSettingsLink({ className }: { className?: string }) {
  const { openSettings } = useConsent()
  return (
    <button type="button" onClick={openSettings} className={className}>
      Süti-beállítások
    </button>
  )
}
