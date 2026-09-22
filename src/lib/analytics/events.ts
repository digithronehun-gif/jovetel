/** Eseménynevek (PRODUCT_SPEC 11. pont). A PostHog csak hozzájárulás után kapja meg őket. */
export const EVENT_NAMES = [
  'landing_view',
  'cta_click',
  'waitlist_submit',
  'waitlist_confirm',
  'signup_start',
  'signup_complete',
  'onboarding_step',
  'search',
  'wizard_complete',
  'ai_interpret',
  'ai_explain_shown',
  'product_view',
  'offer_click',
  'alert_create',
  'lovedone_create',
  'occasion_reminder_open',
  'list_create',
  'list_share',
  'list_reserve',
  'shelf_add',
  'email_click',
] as const

export type EventName = (typeof EVENT_NAMES)[number]

/** A kritikus események a saját `events` táblába is mennek (consent nélkül, személyes adat nélkül). */
export const CRITICAL_EVENTS: ReadonlySet<EventName> = new Set([
  'waitlist_submit',
  'waitlist_confirm',
  'signup_complete',
  'alert_create',
  'lovedone_create',
  'list_create',
  'list_share',
  'list_reserve',
  'shelf_add',
  'wizard_complete',
])

export type EventProps = Record<string, string | number | boolean | null>

/** Személyes adat kiszűrése: e-mail-szerű érték, hosszú szöveg nem kerül eseménybe. */
export function sanitizeProps(props: EventProps = {}): EventProps {
  const out: EventProps = {}
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string') {
      if (/@/.test(v)) continue
      out[k] = v.slice(0, 80)
    } else out[k] = v
  }
  return out
}
