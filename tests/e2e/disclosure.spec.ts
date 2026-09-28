import { expect, test } from '@playwright/test'
import postgres from 'postgres'

/**
 * F6 elfogadási kritérium (3. vasszabály): minden oldaltípuson minden affiliate gomb mellett ott a `Disclosure`, és
 * boltba vivő link csak a `/go` átirányítón át létezik. Az oldaltípusok: landing, keresés, kategória, útmutató-lista,
 * útmutató, termékoldal (több bolttal), „Így rangsorolunk”, affiliate-tájékoztató. Az app-oldalak (F7–F11) a saját
 * fázisukban kerülnek ide.
 */
const DISCLOSURE = 'Partnerlink: ha vásárolsz, jutalékot kaphatunk. Ez nem befolyásolja a sorrendet.'
const sql = postgres(process.env.DATABASE_URL!, { max: 2, prepare: false, onnotice: () => {} })
let pages: string[] = []
let merchantHosts: string[] = []

test.beforeAll(async () => {
  const [product] = await sql<{ slug: string }[]>`
    select p.slug from public.product_stats ps join public.products p on p.id = ps.product_id
    where ps.best_offer_id is not null and ps.offer_count >= 2 order by ps.offer_count desc, p.slug limit 1`
  const [guide] = await sql<{ slug: string }[]>`
    select slug from public.lists where type = 'editorial' and visibility = 'public' and published_at is not null order by slug limit 1`
  pages = [
    '/',
    '/kereses?q=szerum',
    '/kereses?akcio=1',
    '/kategoria/szepsegapolas',
    '/utmutatok',
    ...(guide ? [`/utmutatok/${guide.slug}`] : []),
    `/termek/${product!.slug}`,
    '/igy-rangsorolunk',
    '/affiliate-tajekoztato',
  ]
  merchantHosts = (await sql<{ d: string }[]>`select distinct unnest(domain_allowlist) as d from public.merchants`).map((r) => r.d)
})

test.afterAll(async () => {
  await sql.end()
})

test('minden boltba vivő gomb a /go-n át megy, és a saját blokkjában ott a jelölés', async ({ page }) => {
  let total = 0
  for (const path of pages) {
    await page.goto(path)
    const report = await page.evaluate(
      ({ disclosure, hosts }) => {
        const out = { go: 0, missing: [] as string[], direct: [] as string[] }
        for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
          const url = new URL(a.href, location.href)
          const isGo = url.origin === location.origin && url.pathname.startsWith('/go/')
          const toMerchant = hosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))
          if (toMerchant) out.direct.push(a.href)
          if (!isGo && !a.relList.contains('sponsored')) continue
          out.go++
          const block = a.closest('[data-affiliate]')
          const d = block?.querySelector<HTMLElement>('[data-disclosure]')
          const visible = d && d.offsetParent !== null && getComputedStyle(d).visibility !== 'hidden'
          if (!block || !d || !visible || !d.textContent?.includes(disclosure)) out.missing.push(a.textContent?.trim() || a.href)
          if (!isGo) out.direct.push(a.href)
        }
        return out
      },
      { disclosure: DISCLOSURE, hosts: merchantHosts },
    )
    expect(report.missing, `${path}: gomb jelölés nélkül`).toEqual([])
    expect(report.direct, `${path}: közvetlen bolt-link`).toEqual([])
    total += report.go
  }
  // a teszt nem üres: legalább a termékoldal gombjai (legjobb ajánlat + minden bolt)
  expect(total).toBeGreaterThanOrEqual(3)
})

test('a jelölés linkje az „Így rangsorolunk” oldalra visz, ahol a jutalék nem szempont', async ({ page }) => {
  await page.goto(pages.find((p) => p.startsWith('/termek/'))!)
  const link = page.locator('[data-best-offer] [data-disclosure] a')
  await expect(link).toHaveAttribute('href', '/igy-rangsorolunk')
  await link.click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Így rangsorolunk')
  await expect(page.getByText('A jutalék mértéke, a bolt fizetése vagy bármilyen üzleti megállapodás nem szerepel a rangsorban.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mit rögzítünk, amikor a boltba kattintasz?' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Szponzorált elemek' })).toBeVisible()
})
