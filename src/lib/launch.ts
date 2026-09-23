import { launchMode } from './env'

/**
 * Az ebben a buildben már elkészült nyilvános útvonalak. Minden fázis a saját útvonalát kapcsolja be
 * (F4: belépés, F6: ajándék-varázsló); addig a landing nem linkel 404-re. A `tests/unit/launch.test.ts`
 * ellenőrzi, hogy a kapcsoló és az `app/` tartalma egyezik.
 */
export const ROUTE_READY = {
  /** F4 */
  belepes: false,
  /** F5 */
  kereses: false,
  /** F6 */
  ajandek: false,
  /** F7 */
  app: false,
} as const satisfies Record<string, boolean>

export type ReadyRoute = keyof typeof ROUTE_READY

/** Az útvonal (`/<név>`) linkje, vagy null, ha még nem készült el. */
export function routeHref(route: ReadyRoute): string | null {
  return ROUTE_READY[route] ? `/${route}` : null
}

/** A „Kezdjük el” gombok célja (PRODUCT_SPEC 2. pont: waitlist módban a várólista-űrlap). */
export function startHref(env: Record<string, string | undefined> = process.env): string {
  return launchMode(env) === 'live' && ROUTE_READY.belepes ? '/belepes' : '/#varolista'
}

export function isWaitlistMode(env: Record<string, string | undefined> = process.env): boolean {
  return launchMode(env) === 'waitlist'
}

/** Az ajándék-varázsló linkje (opcionális kezdő kérdéssel), vagy null, ha még nem készült el. */
export function giftHref(q?: string): string | null {
  if (!ROUTE_READY.ajandek) return null
  return q ? `/ajandek?q=${encodeURIComponent(q)}` : '/ajandek'
}
