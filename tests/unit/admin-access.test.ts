import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { adminAccess } from '@/lib/auth/access'

describe('adminAccess (4. vasszabály, route-réteg)', () => {
  it('nincs session vagy nem admin → 404', () => {
    expect(adminAccess(null, null)).toBe('not_found')
    expect(adminAccess({ aal: 'aal2' }, 'user')).toBe('not_found')
    expect(adminAccess({ aal: 'aal2' }, null)).toBe('not_found')
  })
  it('admin MFA nélkül → MFA-lépés; aal2-vel → ok', () => {
    expect(adminAccess({ aal: 'aal1' }, 'admin')).toBe('mfa_required')
    expect(adminAccess({ aal: 'aal2' }, 'admin')).toBe('ok')
  })
})

describe('ingest workflow ütemezése', () => {
  const yml = readFileSync(join(import.meta.dirname, '../../.github/workflows/ingest.yml'), 'utf8')
  const crons = [...yml.matchAll(/cron: '([^']+)'/g)].map((m) => m[1]!)
  it('négy UTC-bejegyzés, ami nyáron és télen is 04:00 és 16:00 Budapest', () => {
    expect(crons).toHaveLength(4)
    const hours = crons.map((c) => Number(c.split(' ')[1]))
    const summer = hours.filter((h) => [4, 16].includes(h + 2))
    const winter = hours.filter((h) => [4, 16].includes(h + 1))
    expect(summer.sort()).toEqual([2, 14])
    expect(winter.sort()).toEqual([3, 15])
  })
  it('a kiválasztó lépés a nyári bejegyzéshez +0200-t, a télihez +0100-t vár', () => {
    expect(yml).toMatch(/'0 2 \* \* \*'\|'0 14 \* \* \*'\) want='\+0200'/)
    expect(yml).toMatch(/'0 3 \* \* \*'\|'0 15 \* \* \*'\) want='\+0100'/)
  })
  it('egyszerre csak egy import fut, és a kézi bemenet csak uuid lehet', () => {
    expect(yml).toMatch(/concurrency:\s*\n\s*group: ingest\s*\n\s*cancel-in-progress: false/)
    expect(yml).toContain('^[0-9a-fA-F-]{36}$')
  })
})
