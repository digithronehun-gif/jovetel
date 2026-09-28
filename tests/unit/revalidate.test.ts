import { describe, expect, it, vi } from 'vitest'
import { notifyRevalidation } from '@/lib/ingestion/pipeline/revalidate'
import { verifySignedBody } from '@/lib/security/hmac'

/** Egyszerű `sql` hamisítvány: a tagged template a megadott sorokat adja vissza. */
const fakeSql = (rows: { slug: string }[]) => (() => Promise.resolve(rows)) as unknown as Parameters<typeof notifyRevalidation>[0]
const SECRET = 'nagyon-titkos-cron-kulcs-123'

describe('notifyRevalidation (ingest → /api/revalidate)', () => {
  it('site URL vagy titok nélkül kihagyja', async () => {
    expect(await notifyRevalidation(fakeSql([{ slug: 'a' }]), new Date(), {})).toEqual({ status: 'skipped', tags: 0 })
  })
  it('a változott termékek címkéit aláírva küldi; a szerveroldali ellenőrzés elfogadja', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fetchImpl = vi.fn(async (url: URL | string, init?: RequestInit) => {
      calls.push({ url: String(url), init: init! })
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch
    const now = 1_790_000_000_000
    const r = await notifyRevalidation(fakeSql([{ slug: 'rozsas-krem' }, { slug: 'szerum' }]), new Date(), {
      siteUrl: 'https://jovetel.hu',
      secret: SECRET,
      fetchImpl,
      now: () => now,
    })
    expect(r).toEqual({ status: 'sent', tags: 2 })
    expect(calls[0]!.url).toBe('https://jovetel.hu/api/revalidate')
    const body = String(calls[0]!.init.body)
    expect(JSON.parse(body)).toEqual({ tags: ['product:rozsas-krem', 'product:szerum'] })
    const h = calls[0]!.init.headers as Record<string, string>
    expect(verifySignedBody(SECRET, { timestamp: h['x-jv-timestamp']!, signature: h['x-jv-signature']! }, body, now)).toBe(true)
  })
  it('sok változásnál egyetlen „catalog” címke; hibás válasz → failed', async () => {
    const many = Array.from({ length: 2001 }, (_, i) => ({ slug: `t-${i}` }))
    const bodies: string[] = []
    const ok = (async (_u: unknown, init?: RequestInit) => {
      bodies.push(String(init!.body))
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch
    expect(await notifyRevalidation(fakeSql(many), new Date(), { siteUrl: 'https://x.hu', secret: SECRET, fetchImpl: ok })).toEqual({ status: 'sent', tags: 1 })
    expect(JSON.parse(bodies[0]!)).toEqual({ tags: ['catalog'] })
    const bad = (async () => new Response('', { status: 401 })) as unknown as typeof fetch
    expect(await notifyRevalidation(fakeSql([{ slug: 'a' }]), new Date(), { siteUrl: 'https://x.hu', secret: SECRET, fetchImpl: bad })).toMatchObject({ status: 'failed', error: 'HTTP 401' })
  })
})
