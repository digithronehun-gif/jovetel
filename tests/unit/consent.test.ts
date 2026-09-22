import { describe, expect, it } from 'vitest'
import { CONSENT_VERSION, parseConsent, sanitizeProps, serializeConsent } from '@/lib/analytics'

describe('süti-hozzájárulás', () => {
  it('oda-vissza alakítás', () => {
    const raw = serializeConsent({ analytics: true, marketing: false }, new Date('2026-09-22T10:00:00Z'))
    expect(parseConsent(raw)).toEqual({ v: CONSENT_VERSION, analytics: true, marketing: false, at: '2026-09-22T10:00:00.000Z' })
  })
  it('régi verzió vagy hibás süti → újra kérdezünk', () => {
    expect(parseConsent(encodeURIComponent(JSON.stringify({ v: 'regi', analytics: true, marketing: true, at: 'x' })))).toBeNull()
    expect(parseConsent('nem-json')).toBeNull()
    expect(parseConsent(undefined)).toBeNull()
  })
  it('eseményekben nincs e-mail és hosszú szöveg', () => {
    expect(sanitizeProps({ hely: 'hero', email: 'a@b.hu', q: 'x'.repeat(200) })).toEqual({ hely: 'hero', q: 'x'.repeat(80) })
  })
})
