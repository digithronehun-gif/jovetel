import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { giftHref, ROUTE_READY, routeHref, startHref, type ReadyRoute } from '@/lib/launch'

const ROOT = join(import.meta.dirname, '../..')

/** Az útvonal oldalfájlja az App Router csoportjaiban. */
const PAGE_FILES: Record<ReadyRoute, string> = {
  belepes: 'app/(auth)/belepes/page.tsx',
  kereses: 'app/(catalog)/kereses/page.tsx',
  ajandek: 'app/(catalog)/ajandek/page.tsx',
  app: 'app/(app)/app/page.tsx',
}

describe('ROUTE_READY', () => {
  for (const route of Object.keys(ROUTE_READY) as ReadyRoute[]) {
    it(`/${route}: a kapcsoló egyezik azzal, hogy az oldal létezik`, () => {
      expect(existsSync(join(ROOT, PAGE_FILES[route]))).toBe(ROUTE_READY[route])
    })
  }

  it('el nem készült útvonalra nincs link', () => {
    for (const route of Object.keys(ROUTE_READY) as ReadyRoute[]) {
      expect(routeHref(route)).toBe(ROUTE_READY[route] ? `/${route}` : null)
    }
    if (!ROUTE_READY.ajandek) expect(giftHref('bármi')).toBeNull()
    else expect(giftHref('szérum 10 ezer alatt')).toBe('/ajandek?q=sz%C3%A9rum%2010%20ezer%20alatt')
  })

  it('waitlist módban a „Kezdjük el” mindig a várólistára visz', () => {
    expect(startHref({ LAUNCH_MODE: 'waitlist' })).toBe('/#varolista')
    expect(startHref({ LAUNCH_MODE: 'live' })).toBe(ROUTE_READY.belepes ? '/belepes' : '/#varolista')
  })
})
