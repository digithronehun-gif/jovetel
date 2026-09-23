/** A PostHog EU-példány (CLAUDE.md 4. pont: PostHog EU). A CSP és a kliens ugyanezt használja. */
export const POSTHOG_DEFAULT_HOST = 'https://eu.i.posthog.com'

/** A PostHog kulcsa és hosztja, vagy null, ha nincs beállítva (ilyenkor nincs PostHog). */
export function posthogConfig(): { key: string; host: string } | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null
  return { key, host: process.env.NEXT_PUBLIC_POSTHOG_HOST || POSTHOG_DEFAULT_HOST }
}
