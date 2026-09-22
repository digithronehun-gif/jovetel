import { launchMode } from './env'

/** A „Kezdjük el” gombok célja (PRODUCT_SPEC 2. pont: waitlist módban a várólista-űrlap). */
export function startHref(env: Record<string, string | undefined> = process.env): string {
  return launchMode(env) === 'live' ? '/belepes' : '/#varolista'
}

export function isWaitlistMode(env: Record<string, string | undefined> = process.env): boolean {
  return launchMode(env) === 'waitlist'
}
