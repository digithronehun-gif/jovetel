import { afterEach, describe, expect, it } from 'vitest'
import { POSTHOG_DEFAULT_HOST, posthogConfig } from '@/lib/analytics/posthog'
import { buildCsp, createNonce } from '@/lib/security/csp'

describe('CSP', () => {
  it('nonce + strict-dynamic, nincs unsafe-inline a scriptre', () => {
    const csp = buildCsp({ nonce: 'abc' })
    const script = csp.split('; ').find((d) => d.startsWith('script-src'))!
    expect(script).toContain("'nonce-abc'")
    expect(script).toContain("'strict-dynamic'")
    expect(script).not.toContain("'unsafe-inline'")
    expect(script).not.toContain("'unsafe-eval'")
  })
  it('frame-ancestors none, object-src none, base-uri self, upgrade-insecure-requests élesben', () => {
    const csp = buildCsp({ nonce: 'x' })
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain('upgrade-insecure-requests')
  })
  it('fejlesztésben unsafe-eval (React hibakeresés), upgrade nélkül', () => {
    const csp = buildCsp({ nonce: 'x', dev: true })
    expect(csp).toContain("'unsafe-eval'")
    expect(csp).not.toContain('upgrade-insecure-requests')
  })
  it('connect-src: Supabase (https + wss) és PostHog EU', () => {
    const csp = buildCsp({ nonce: 'x', supabaseUrl: 'https://abc.supabase.co', posthogHost: 'https://eu.i.posthog.com' })
    const connect = csp.split('; ').find((d) => d.startsWith('connect-src'))!
    expect(connect).toContain('https://abc.supabase.co')
    expect(connect).toContain('wss://abc.supabase.co')
    expect(connect).toContain('https://eu.i.posthog.com')
    expect(connect).toContain('https://eu-assets.i.posthog.com')
  })
  it('http-n futó helyi production szerveren kikapcsolható a felminősítés', () => {
    expect(buildCsp({ nonce: 'x', upgradeInsecureRequests: false })).not.toContain('upgrade-insecure-requests')
    expect(buildCsp({ nonce: 'x', dev: true, upgradeInsecureRequests: true })).toContain('upgrade-insecure-requests')
  })
  it('a nonce minden hívásra más és elég hosszú', () => {
    const a = createNonce()
    const b = createNonce()
    expect(a).not.toBe(b)
    expect(atob(a)).toHaveLength(16)
  })
})

describe('PostHog-konfiguráció', () => {
  const saved = { key: process.env.NEXT_PUBLIC_POSTHOG_KEY, host: process.env.NEXT_PUBLIC_POSTHOG_HOST }
  afterEach(() => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = saved.key
    process.env.NEXT_PUBLIC_POSTHOG_HOST = saved.host
    if (saved.key === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (saved.host === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_HOST
  })
  it('kulcs nélkül nincs PostHog', () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY
    expect(posthogConfig()).toBeNull()
  })
  it('kulccsal, hoszt nélkül az EU-példány, és a CSP ugyanezt engedi', () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_teszt'
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST
    const ph = posthogConfig()
    expect(ph).toEqual({ key: 'phc_teszt', host: POSTHOG_DEFAULT_HOST })
    const connect = buildCsp({ nonce: 'x', posthogHost: ph?.host }).split('; ').find((d) => d.startsWith('connect-src'))!
    expect(connect).toContain('https://eu.i.posthog.com')
  })
})
