import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { syncConversions } from '../../src/lib/tracking/conversions/sync'
import { ROOT_DIR } from './env'
import { createTestDatabase } from './prepare'

/**
 * F6 elfogadási kritérium: a szintetikus konverzió helyesen párosul. Minden hálózatnál ugyanaz a forgatókönyv
 * (tests/fixtures/conversions): két naplózott kattintás (`Fx7Qk2Lm9Pz1`, `Rt4Yw8Nb3Hc6`), a tranzakciók a
 * subID-jükkel; az idegen subID-s tétel a program-azonosítóból kap kereskedőt, kattintást nem.
 */
const fixture = (code: string) => JSON.parse(readFileSync(join(ROOT_DIR, 'tests/fixtures/conversions', `${code}.json`), 'utf8')) as unknown
const NOW = new Date('2026-09-28T10:00:00Z')
const NETWORKS = ['awin', 'cj', 'admitad', 'dognet'] as const
let sql: postgres.Sql
const merchantOf = new Map<string, string>()
const otherMerchantOf = new Map<string, string>()

beforeAll(async () => {
  sql = postgres(await createTestDatabase('jovetel_test_conversions'), { max: 2, prepare: false, onnotice: () => {} })
  for (const code of NETWORKS) {
    const [n] = await sql<{ id: string }[]>`insert into public.networks (code, name) values (${code}, ${code}) returning id`
    const [m] = await sql<{ id: string }[]>`
      insert into public.merchants (network_id, slug, name, status, program_id) values (${n!.id}, ${`bolt-${code}`}, ${`Bolt ${code}`}, 'active', 'P-DEMO-1')
      returning id`
    // ugyanazon a hálózaton egy másik bolt: a kattintás kereskedője győz a program-azonosító felett
    const [o] = await sql<{ id: string }[]>`
      insert into public.merchants (network_id, slug, name, status, program_id) values (${n!.id}, ${`masik-${code}`}, ${`Másik ${code}`}, 'active', 'P-OTHER')
      returning id`
    merchantOf.set(code, m!.id)
    otherMerchantOf.set(code, o!.id)
  }
})

afterAll(async () => {
  await sql?.end()
})

async function withClicks(code: string, fn: () => Promise<void>) {
  // a két kattintás ennek a hálózatnak a (másik) boltjához tartozik
  await sql`delete from public.clicks`
  await sql`
    insert into public.clicks (click_id, merchant_id, placement, ip_hash, is_bot)
    values ('Fx7Qk2Lm9Pz1', ${otherMerchantOf.get(code)!}, 'product_best', 'h', false),
           ('Rt4Yw8Nb3Hc6', ${otherMerchantOf.get(code)!}, 'product_offers', 'h', false)`
  await fn()
}

describe.each(NETWORKS)('%s: szintetikus konverziók párosítása', (code) => {
  it('első futás: minden érvényes tétel beíródik, a kattintás és a kereskedő párosul', async () => {
    await withClicks(code, async () => {
      const [s] = await syncConversions(sql, { now: NOW, only: [code], payloads: { [code]: [fixture(code)] } })
      expect(s).toMatchObject({ network: code, status: 'ok', inserted: s!.parsed, updated: 0, withClick: 3 })
      const rows = await sql<{ network_transaction_id: string; click_id: string | null; merchant_id: string | null; status: string; commission_huf: number | null }[]>`
        select c.network_transaction_id, c.click_id, c.merchant_id, c.status, c.commission_huf
        from public.conversions c join public.networks n on n.id = c.network_id where n.code = ${code}
        order by c.occurred_at`
      const withClick = rows.filter((r) => r.click_id)
      expect(withClick.map((r) => r.click_id).sort()).toEqual(['Fx7Qk2Lm9Pz1', 'Fx7Qk2Lm9Pz1', 'Rt4Yw8Nb3Hc6'])
      // a kattintásból feloldott kereskedő (nem a program-azonosítóé)
      expect(new Set(withClick.map((r) => r.merchant_id))).toEqual(new Set([otherMerchantOf.get(code)]))
      // idegen subID: nincs kattintás, a kereskedő a program-azonosítóból
      const foreign = rows.filter((r) => !r.click_id)
      expect(foreign.length).toBeGreaterThan(0)
      for (const r of foreign) expect([merchantOf.get(code), null]).toContain(r.merchant_id)
      expect(foreign.some((r) => r.merchant_id === merchantOf.get(code))).toBe(true)
      expect(rows.map((r) => r.status).sort()).toEqual(expect.arrayContaining(['approved', 'pending', 'rejected']))
    })
  })

  it('újrafuttatás: 0 írás (idempotens)', async () => {
    await withClicks(code, async () => {
      const [s] = await syncConversions(sql, { now: new Date(NOW.getTime() + 3600e3), only: [code], payloads: { [code]: [fixture(code)] } })
      expect(s).toMatchObject({ status: 'ok', inserted: 0, updated: 0 })
      expect(s!.unchanged).toBe(s!.parsed)
    })
  })

  it('státuszváltás (függő → jóváhagyott): pontosan egy frissítés', async () => {
    await withClicks(code, async () => {
      const text = JSON.stringify(fixture(code))
        .replace('"commissionStatus": "pending"', '"commissionStatus": "approved"')
        .replace('"commissionStatus":"pending"', '"commissionStatus":"approved"')
        .replace('"actionStatus":"new"', '"actionStatus":"closed"')
        .replace('"status":"pending"', '"status":"approved"')
        .replace('"status":"P"', '"status":"A"')
      const [s] = await syncConversions(sql, { now: NOW, only: [code], payloads: { [code]: [JSON.parse(text)] } })
      expect(s).toMatchObject({ status: 'ok', inserted: 0, updated: 1 })
      const [first] = await sql<{ status: string }[]>`
        select c.status from public.conversions c join public.networks n on n.id = c.network_id
        where n.code = ${code} and c.click_id = 'Fx7Qk2Lm9Pz1' order by c.occurred_at desc limit 1`
      expect(first!.status).toBe('approved')
    })
  })
})

describe('kulcs nélkül', () => {
  it('a hálózat kimarad (hiba nélkül), és csak a hiányzó változók NEVE szerepel', async () => {
    const stats = await syncConversions(sql, { now: NOW, env: {}, fetchImpl: (() => Promise.reject(new Error('nem hívható'))) as typeof fetch })
    expect(stats.map((s) => s.status)).toEqual(['skipped', 'skipped', 'skipped', 'skipped'])
    expect(stats[0]!.reason).toBe('hiányzó beállítás: AWIN_API_TOKEN, AWIN_PUBLISHER_ID')
  })
  it('hálózati hiba egy hálózatnál nem állítja meg a többit', async () => {
    const failing = (async () => new Response('x', { status: 500 })) as unknown as typeof fetch
    const stats = await syncConversions(sql, {
      now: NOW,
      env: { AWIN_API_TOKEN: 't', AWIN_PUBLISHER_ID: '1' },
      fetchImpl: failing,
    })
    expect(stats.find((s) => s.network === 'awin')).toMatchObject({ status: 'failed', reason: 'Awin tranzakció-API: HTTP 500' })
    expect(stats.filter((s) => s.network !== 'awin').every((s) => s.status === 'skipped')).toBe(true)
  })
})
