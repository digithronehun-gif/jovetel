'use client'

import { SwitchField } from '@/components/ui/Switch'

/** A süti-sáv részletes beállításai (szükséges · analitika · marketing). Igény szerint töltődik. */
export function ConsentSwitches({
  analytics,
  marketing,
  onAnalytics,
  onMarketing,
}: {
  analytics: boolean
  marketing: boolean
  onAnalytics: (v: boolean) => void
  onMarketing: (v: boolean) => void
}) {
  return (
    <div className="mt-3 flex flex-col divide-y divide-line border-y border-line">
      <SwitchField id="consent-necessary" label="Szükséges" description="Belépés, biztonság, a döntésed megjegyzése." checked disabled />
      <SwitchField
        id="consent-analytics"
        label="Analitika"
        description="Névtelen használati statisztika (PostHog, EU-szerver)."
        checked={analytics}
        onCheckedChange={onAnalytics}
      />
      <SwitchField
        id="consent-marketing"
        label="Marketing"
        description="Kampányaink mérése (pl. melyik videóból érkeztél)."
        checked={marketing}
        onCheckedChange={onMarketing}
      />
    </div>
  )
}
