import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test'
import postgres from 'postgres'

/**
 * F6: a `/go/[offerId]` követett átirányító (ARCHITECTURE 4. pont, 5. vasszabály). Open redirect tesztcsomag:
 * abszolút URL, protokoll-relatív, kódolt, láncolt, Host-fejléc, idegen host a feedben — egyik sem viheti a
 * látogatót engedélylistán kívüli hostra. A teszt saját ajánlatokat hoz létre, a feed-importot megkerülve (így a
 * „feedben lévő” idegen host is az adatbázisba kerül, ahogy egy importhiba után lenne).
 */
const sql = postgres(process.env.DATABASE_URL!, { max: 2, prepare: false, onnotice: () => {} })
const slug = `e2e-go-${Date.now()}`
const CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'
const AWIN_DEEPLINK = 'https://www.awin1.com/pclick.php?p=111&a=222&m=333'
const ids: Record<'tracked' | 'foreignUrl' | 'foreignDeeplink' | 'inactive' | 'plain', string> = {} as never

let ipSeq = 0
/** Tesztenként külön (kitalált) IP, hogy a rate limit ne keveredjen a tesztek között. */
const nextIp = () => `198.51.100.${(++ipSeq % 250) + 1}`

async function go(request: APIRequestContext, path: string, headers: Record<string, string> = {}): Promise<APIResponse> {
  return request.get(path, { maxRedirects: 0, headers: { 'user-agent': CHROME, 'x-forwarded-for': nextIp(), ...headers } })
}

/** A Location vagy engedélylistás külső host (https), vagy belső, relatív útvonal — más nem lehet. */
function expectSafeLocation(res: APIResponse, allowedHosts: string[]) {
  const loc = res.headers()['location']
  if (!loc) return
  if (loc.startsWith('/')) {
    expect(loc.startsWith('//'), loc).toBe(false)
    expect(loc.includes('\\'), loc).toBe(false)
    return
  }
  const u = new URL(loc)
  expect(allowedHosts, loc).toContain(u.host)
}

test.beforeAll(async () => {
  const [m] = await sql<{ id: string }[]>`select id from public.merchants where slug = 'demo-napfeny-drogeria'`
  const [p] = await sql<{ id: string }[]>`
    insert into public.products (slug, name, brand_name) values (${slug}, 'Go-teszt termék', 'Teszt') returning id`
  const offer = async (sku: string, url: string, deeplink: string | null, active = true) =>
    (
      await sql<{ id: string }[]>`
        insert into public.offers (product_id, merchant_id, merchant_sku, url, deeplink_template, price_huf, is_active)
        values (${p!.id}, ${m!.id}, ${`${slug}-${sku}`}, ${url}, ${deeplink}, 5000, ${active}) returning id`
    )[0]!.id
  ids.tracked = await offer('a', 'https://napfeny-drogeria.example/termek/go-teszt', AWIN_DEEPLINK)
  ids.foreignUrl = await offer('b', 'https://evil.example/adathalasz', null)
  ids.foreignDeeplink = await offer('c', 'https://napfeny-drogeria.example/termek/go-teszt-c', 'https://evil.example/pclick.php?p=1')
  ids.inactive = await offer('d', 'https://napfeny-drogeria.example/termek/go-teszt-d', AWIN_DEEPLINK, false)
  ids.plain = await offer('e', 'https://www.napfeny-drogeria.example/termek/go-teszt-e', null)
})

test.afterAll(async () => {
  await sql`delete from public.clicks where offer_id in (select id from public.offers where merchant_sku like ${`${slug}-%`})`
  await sql`delete from public.products where slug = ${slug}`
  await sql.end()
})

test.describe('/go/[offerId]', () => {
  test('követett ajánlat: 302 a hálózat linkjére, click_id a subID-ben (Awin: clickref), no-store; a kattintás naplózva', async ({ request }) => {
    const res = await go(request, `/go/${ids.tracked}?placement=product_best&ref=guide:az-elso-szerumod`)
    expect(res.status()).toBe(302)
    const h = res.headers()
    expect(h['cache-control']).toBe('no-store')
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(h['x-robots-tag']).toContain('noindex')
    const loc = new URL(h['location']!)
    expect(loc.origin + loc.pathname).toBe('https://www.awin1.com/pclick.php')
    expect(loc.searchParams.get('p')).toBe('111')
    const clickId = loc.searchParams.get('clickref')!
    expect(clickId).toMatch(/^[0-9A-Za-z]{12}$/)
    // nem blokkoló naplózás: a sor a válasz után jelenik meg
    await expect
      .poll(async () => (await sql`select placement, content_ref, is_bot, ip_hash, ua_hash, user_id, offer_id from public.clicks where click_id = ${clickId}`)[0])
      .toMatchObject({ placement: 'product_best', content_ref: 'guide:az-elso-szerumod', is_bot: false, user_id: null, offer_id: ids.tracked })
    const [row] = await sql<{ ip_hash: string }[]>`select ip_hash from public.clicks where click_id = ${clickId}`
    expect(row!.ip_hash).not.toContain('198.51.100.')
    expect(row!.ip_hash).toMatch(/^[A-Za-z0-9_-]{32}$/)
  })

  test('két kattintás = két különböző click_id', async ({ request }) => {
    const a = new URL((await go(request, `/go/${ids.tracked}`)).headers()['location']!).searchParams.get('clickref')
    const b = new URL((await go(request, `/go/${ids.tracked}`)).headers()['location']!).searchParams.get('clickref')
    expect(a).not.toBe(b)
  })

  test('ismeretlen placement / ref: a látogató ettől még a boltba jut, de nem naplózzuk', async ({ request }) => {
    const res = await go(request, `/go/${ids.tracked}?placement=<script>&ref=https://evil.example`)
    expect(res.status()).toBe(302)
    const clickId = new URL(res.headers()['location']!).searchParams.get('clickref')!
    await expect
      .poll(async () => (await sql`select placement, content_ref from public.clicks where click_id = ${clickId}`)[0])
      .toEqual({ placement: null, content_ref: null })
  })

  test('bot user-agent: átirányít, de is_bot = true', async ({ request }) => {
    const res = await go(request, `/go/${ids.tracked}?placement=product_offers`, { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' })
    expect(res.status()).toBe(302)
    const clickId = new URL(res.headers()['location']!).searchParams.get('clickref')!
    await expect.poll(async () => (await sql`select is_bot from public.clicks where click_id = ${clickId}`)[0]?.is_bot).toBe(true)
  })

  test('követő link nélküli ajánlat: a bolt saját oldala (aldomain is engedélyezett)', async ({ request }) => {
    const res = await go(request, `/go/${ids.plain}`)
    expect(res.status()).toBe(302)
    expect(new URL(res.headers()['location']!).host).toBe('www.napfeny-drogeria.example')
  })

  test('inaktív ajánlat: a termékoldalra (relatív Location, a Host fejléc nem számít)', async ({ request }) => {
    const res = await go(request, `/go/${ids.inactive}`, { host: 'evil.example', 'x-forwarded-host': 'evil.example' })
    expect(res.status()).toBe(302)
    expect(res.headers()['location']).toBe(`/termek/${slug}`)
  })
})

test.describe('open redirect tesztcsomag (5. vasszabály)', () => {
  const allowed = ['www.awin1.com', 'napfeny-drogeria.example', 'www.napfeny-drogeria.example']

  test('idegen host a feedben (bolt URL): nem visz ki, a termékoldalra irányít', async ({ request }) => {
    const res = await go(request, `/go/${ids.foreignUrl}`)
    expect(res.status()).toBe(302)
    expect(res.headers()['location']).toBe(`/termek/${slug}`)
    expect(await sql`select 1 from public.clicks where offer_id = ${ids.foreignUrl}`).toHaveLength(0)
  })

  test('idegen host a feed követő linkjében: a bolt saját (engedélylistás) oldalára, jutalék nélkül', async ({ request }) => {
    const res = await go(request, `/go/${ids.foreignDeeplink}`)
    expect(res.status()).toBe(302)
    expect(res.headers()['location']).toBe('https://napfeny-drogeria.example/termek/go-teszt-c')
  })

  test('cél-URL paraméterben (abszolút, protokoll-relatív, kódolt, láncolt): figyelmen kívül marad', async ({ request }) => {
    const attacks = [
      '?url=https://evil.example/',
      '?to=//evil.example/',
      '?redirect=https%3A%2F%2Fevil.example%2F',
      '?next=%2F%2Fevil.example',
      '?dest=javascript:alert(1)',
      `?next=/go/${ids.foreignUrl}`,
      '?placement=https://evil.example&ref=//evil.example',
      '?url=https://evil.example&url=https://evil2.example',
    ]
    for (const q of attacks) {
      const res = await go(request, `/go/${ids.tracked}${q}`)
      expect(res.status(), q).toBe(302)
      expect(new URL(res.headers()['location']!).host, q).toBe('www.awin1.com')
      expect(res.headers()['location'], q).not.toContain('evil')
    }
  })

  test('az útvonalban (nem uuid, kódolt, dupla perjel, bejárás, nem létező): 404 vagy belső útvonal', async ({ request }) => {
    const paths = [
      '/go/https:%2F%2Fevil.example',
      '/go/%2F%2Fevil.example',
      '/go//evil.example',
      '/go/evil.example',
      '/go/..%2F..%2Fevil.example',
      '/go/%2e%2e/%2e%2e/evil.example',
      `/go/${ids.tracked}%2F..%2F..%2Fevil.example`,
      `/go/${ids.tracked}@evil.example`,
      '/go/00000000-0000-4000-8000-000000000000',
      '/go/not-a-uuid',
      `/go/${ids.tracked.toUpperCase()}x`,
    ]
    for (const p of paths) {
      const res = await go(request, p)
      expect([301, 302, 307, 308, 404], p).toContain(res.status())
      expectSafeLocation(res, allowed)
      // belső (relatív) átirányítás, pl. a dupla perjel normalizálása: annak a célja is csak 404 lehet
      const loc = res.headers()['location']
      if (loc?.startsWith('/')) {
        const next = await go(request, loc)
        expect(next.status(), `${p} → ${loc}`).toBe(404)
      }
    }
  })

  test('csak GET: más metódus nem irányít át', async ({ request }) => {
    const res = await request.post(`/go/${ids.tracked}`, { maxRedirects: 0, headers: { 'user-agent': CHROME } })
    expect(res.status()).toBe(405)
  })

  test('rate limit: 60 kattintás / perc / IP, utána 429', async ({ request }) => {
    const ip = '203.0.113.77'
    let last = 0
    for (let i = 0; i < 61; i++) last = (await go(request, `/go/${ids.plain}`, { 'x-forwarded-for': ip })).status()
    expect(last).toBe(429)
  })
})
