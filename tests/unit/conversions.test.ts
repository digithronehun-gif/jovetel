import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONVERSION_SOURCES } from '@/lib/tracking/conversions/sync'
import { splitWindow, toDate, toHuf } from '@/lib/tracking/conversions/types'

const fixture = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, '../fixtures/conversions', `${name}.json`), 'utf8')) as unknown

/** Minden hálózat fixture-je ugyanazt a forgatókönyvet írja le (lásd tests/fixtures/conversions/README.md). */
const EXPECTED = {
  awin: { ids: ['900000001', '900000002', '900000003', '900000004', '900000006'], rejected: 2, nonHuf: '900000006' },
  cj: { ids: ['3001001', '3001002', '3001003', '3001004'], rejected: 1, nonHuf: null },
  admitad: { ids: ['7700001', '7700002', '7700003', '7700004', '7700006'], rejected: 1, nonHuf: '7700004' },
  dognet: { ids: ['dg-0001', 'dg-0002', 'dg-0003', 'dg-0004'], rejected: 1, nonHuf: null },
} as const

describe.each(Object.entries(EXPECTED))('%s tranzakciók → közös alak', (code, exp) => {
  const r = CONVERSION_SOURCES[code]!.parse(fixture(code))
  const byId = new Map(r.items.map((i) => [i.networkTransactionId, i]))
  const [pending, approved, rejected, foreign] = exp.ids.map((id) => byId.get(id)!)

  it('érvényes tételek és az elutasított (hibás) tételek száma', () => {
    expect(r.items.map((i) => i.networkTransactionId)).toEqual(exp.ids)
    expect(r.rejected).toBe(exp.rejected)
  })
  it('függő tétel: click_id a subID-ből, összegek egész forintban, időpont UTC-ben', () => {
    expect(pending).toMatchObject({ status: 'pending', clickId: 'Fx7Qk2Lm9Pz1', programId: 'P-DEMO-1', orderValueHuf: 12990, commissionHuf: 1299 })
    expect(pending!.occurredAt.toISOString()).toBe('2026-09-20T14:31:00.000Z')
  })
  it('jóváhagyott tétel: kerekített jutalék, frissítési idő', () => {
    expect(approved).toMatchObject({ status: 'approved', clickId: 'Rt4Yw8Nb3Hc6', commissionHuf: 451 })
    expect(approved!.updatedAt?.toISOString()).toBe('2026-09-26T10:00:00.000Z')
  })
  it('elutasított (visszaküldött) tétel', () => {
    expect(rejected!.status).toBe('rejected')
  })
  it('idegen vagy üres subID: nincs click_id (nem párosítjuk találgatással)', () => {
    expect(foreign!.clickId).toBeNull()
  })
  it('nem forintos tétel: az összeg null, a pénznem a raw-ban marad', () => {
    if (!exp.nonHuf) return
    const t = byId.get(exp.nonHuf)!
    expect(t.orderValueHuf).toBeNull()
    expect(t.commissionHuf).toBeNull()
    expect(JSON.stringify(t.raw)).toContain('EUR')
  })
  it('a raw csak engedélyezett mezőket tart meg (személyes / rendelési adat nem kerül a DB-be)', () => {
    expect(JSON.stringify(r.items.map((i) => i.raw))).not.toContain('SHOULD-NOT-BE-STORED')
  })
})

describe('segédfüggvények', () => {
  it('toHuf: kerekítés, szöveges tizedes, negatív és nem forint → null', () => {
    expect(toHuf(1299.5, 'HUF')).toBe(1300)
    expect(toHuf('450,49', 'huf')).toBe(450)
    expect(toHuf(-899, 'HUF')).toBeNull()
    expect(toHuf(12, 'EUR')).toBeNull()
    expect(toHuf('abc', 'HUF')).toBeNull()
  })
  it('toDate: eltolás nélkül UTC; szóközös formátum; érvénytelen → null', () => {
    expect(toDate('2026-09-20 14:31:00')?.toISOString()).toBe('2026-09-20T14:31:00.000Z')
    expect(toDate('2026-09-20T14:31:00+02:00')?.toISOString()).toBe('2026-09-20T12:31:00.000Z')
    expect(toDate('2026-09-20')?.toISOString()).toBe('2026-09-20T00:00:00.000Z')
    expect(toDate('tegnap')).toBeNull()
    expect(toDate(null)).toBeNull()
  })
  it('splitWindow: 60 nap → 31 + 29 nap', () => {
    const w = splitWindow({ from: new Date('2026-07-30T00:00:00Z'), to: new Date('2026-09-28T00:00:00Z') }, 31)
    expect(w.map((x) => [x.from.toISOString().slice(0, 10), x.to.toISOString().slice(0, 10)])).toEqual([
      ['2026-07-30', '2026-08-30'],
      ['2026-08-30', '2026-09-28'],
    ])
  })
})

describe('lekérés (API-hívás nélkül, hamis fetch-csel)', () => {
  const window = { from: new Date('2026-07-30T00:00:00Z'), to: new Date('2026-09-28T00:00:00Z') }
  function fakeFetch(responder: (url: string, init?: RequestInit) => unknown) {
    const calls: { url: string; init?: RequestInit }[] = []
    const impl = (async (input: string | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, init })
      return new Response(JSON.stringify(responder(url, init)), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }) as typeof fetch
    return { impl, calls }
  }

  it('Awin: két 31 napon belüli ablak, Bearer token, a publisher-azonosító az útvonalban', async () => {
    const { impl, calls } = fakeFetch(() => [])
    await CONVERSION_SOURCES.awin!.fetch(window, { env: { AWIN_API_TOKEN: 'titok', AWIN_PUBLISHER_ID: '123' }, fetchImpl: impl })
    expect(calls).toHaveLength(2)
    const u = new URL(calls[0]!.url)
    expect(u.origin + u.pathname).toBe('https://api.awin.com/publishers/123/transactions/')
    expect(u.searchParams.get('startDate')).toBe('2026-07-30T00:00:00')
    expect(u.searchParams.get('timezone')).toBe('UTC')
    expect((calls[0]!.init?.headers as Record<string, string>).Authorization).toBe('Bearer titok')
  })
  it('CJ: GraphQL POST, lapozás a maxCommissionId-vel, amíg a payload nem teljes', async () => {
    let n = 0
    const { impl, calls } = fakeFetch(() => ({ data: { publisherCommissions: { payloadComplete: ++n % 2 === 0, maxCommissionId: String(n), records: [] } } }))
    await CONVERSION_SOURCES.cj!.fetch(window, { env: { CJ_API_TOKEN: 't', CJ_PUBLISHER_ID: '777' }, fetchImpl: impl })
    // 2 ablak × (1 nem teljes + 1 teljes)
    expect(calls).toHaveLength(4)
    const body = JSON.parse(String(calls[1]!.init?.body)) as { variables: { pub: string[]; sinceId: string } }
    expect(body.variables.pub).toEqual(['777'])
    expect(body.variables.sinceId).toBe('1')
  })
  it('Admitad: token, majd lapozott lekérés a count szerint', async () => {
    const { impl, calls } = fakeFetch((url) =>
      url.includes('/token/') ? { access_token: 'acc' } : { results: [{}], _meta: { count: 700, limit: 500, offset: 0 } },
    )
    await CONVERSION_SOURCES.admitad!.fetch(window, { env: { ADMITAD_CLIENT_ID: 'id', ADMITAD_CLIENT_SECRET: 'sec' }, fetchImpl: impl })
    expect(calls.map((c) => new URL(c.url).pathname)).toEqual(['/token/', '/statistics/actions/', '/statistics/actions/'])
    expect(new URL(calls[1]!.url).searchParams.get('date_start')).toBe('30.07.2026')
    expect(new URL(calls[2]!.url).searchParams.get('offset')).toBe('500')
    expect((calls[1]!.init?.headers as Record<string, string>).Authorization).toBe('Bearer acc')
  })
  it('Dognet: csak https cím; a hibaüzenet titkot nem tartalmaz', async () => {
    const { impl } = fakeFetch(() => [])
    await expect(CONVERSION_SOURCES.dognet!.fetch(window, { env: { DOGNET_CONVERSIONS_URL: 'http://x.example/tx', DOGNET_API_KEY: 'k' }, fetchImpl: impl })).rejects.toThrow(/https/)
    const failing = (async () => new Response('nope', { status: 401 })) as unknown as typeof fetch
    const err = await CONVERSION_SOURCES.awin!.fetch(window, { env: { AWIN_API_TOKEN: 'szupertitok', AWIN_PUBLISHER_ID: '1' }, fetchImpl: failing }).catch((e: Error) => e)
    expect(String(err)).toContain('HTTP 401')
    expect(String(err)).not.toContain('szupertitok')
  })
})
