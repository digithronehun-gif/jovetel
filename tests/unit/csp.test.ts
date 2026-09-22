import { describe, expect, it } from 'vitest'
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
  it('a nonce minden hívásra más és elég hosszú', () => {
    const a = createNonce()
    const b = createNonce()
    expect(a).not.toBe(b)
    expect(atob(a)).toHaveLength(16)
  })
})
