import { describe, expect, it } from 'vitest'
import { signBody, verifySignedBody } from '@/lib/security/hmac'

const SECRET = 'nagyon-titkos-cron-kulcs-123'
const NOW = 1_790_000_000_000

describe('HMAC-aláírás (cron / revalidate)', () => {
  const ts = Math.floor(NOW / 1000)
  const body = '{"tags":["catalog"]}'
  const sig = signBody(SECRET, ts, body)
  it('helyes aláírás elfogadva', () => {
    expect(verifySignedBody(SECRET, { timestamp: String(ts), signature: sig }, body, NOW)).toBe(true)
  })
  it('más törzs, más kulcs, hiányzó fejléc elutasítva', () => {
    expect(verifySignedBody(SECRET, { timestamp: String(ts), signature: sig }, '{"tags":["product:x"]}', NOW)).toBe(false)
    expect(verifySignedBody('masik-titkos-kulcs-abcdef', { timestamp: String(ts), signature: sig }, body, NOW)).toBe(false)
    expect(verifySignedBody(SECRET, { timestamp: null, signature: sig }, body, NOW)).toBe(false)
    expect(verifySignedBody(undefined, { timestamp: String(ts), signature: sig }, body, NOW)).toBe(false)
    expect(verifySignedBody('rovid', { timestamp: String(ts), signature: signBody('rovid', ts, body) }, body, NOW)).toBe(false)
  })
  it('5 percnél régebbi (visszajátszott) vagy jövőbeli időbélyeg elutasítva', () => {
    const old = ts - 301
    expect(verifySignedBody(SECRET, { timestamp: String(old), signature: signBody(SECRET, old, body) }, body, NOW)).toBe(false)
    const future = ts + 301
    expect(verifySignedBody(SECRET, { timestamp: String(future), signature: signBody(SECRET, future, body) }, body, NOW)).toBe(false)
    const ok = ts - 299
    expect(verifySignedBody(SECRET, { timestamp: String(ok), signature: signBody(SECRET, ok, body) }, body, NOW)).toBe(true)
  })
  it('hibás formátumú aláírás nem dob kivételt', () => {
    expect(verifySignedBody(SECRET, { timestamp: String(ts), signature: 'nem-hex' }, body, NOW)).toBe(false)
    expect(verifySignedBody(SECRET, { timestamp: 'abc', signature: sig }, body, NOW)).toBe(false)
  })
})

describe('production-deploy előfeltételek (F6-átnézés)', async () => {
  const { productionEnvProblems } = await import('@/lib/security/prodEnv')
  it('nem productionben nincs követelmény', () => {
    expect(productionEnvProblems({ NODE_ENV: 'development' })).toEqual([])
  })
  it('productionben a só, a CRON_SECRET és az Upstash kötelező; a titok legalább 16 karakter', () => {
    expect(productionEnvProblems({ VERCEL_ENV: 'production' }).map((p) => p.name)).toEqual([
      'IP_HASH_SALT',
      'CRON_SECRET',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
    ])
    expect(productionEnvProblems({ APP_ENV: 'production', IP_HASH_SALT: 'rovid', CRON_SECRET: 'x'.repeat(32), UPSTASH_REDIS_REST_URL: 'https://u', UPSTASH_REDIS_REST_TOKEN: 't' })).toEqual([
      { name: 'IP_HASH_SALT', problem: 'too_short' },
    ])
  })
})
