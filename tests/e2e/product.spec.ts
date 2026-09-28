import { expect, test, type Page } from '@playwright/test'
import postgres from 'postgres'

/**
 * F5: termékoldal. A teszt saját terméket hoz létre ismert ajánlatokkal (így az elvárt sorrend és ítélet pontosan
 * ismert, és a termékoldal adat-gyorsítótára sem zavar):
 *   A  [DEMO] Napfény Drogéria  9 000 + 990 = 9 990 Ft, készleten, friss, 20 nap ártörténet 10 000 Ft-on → Valódi akció
 *   B  [DEMO] Bőrkert Patika    8 700 + 1 490 = 10 190 Ft (olcsóbb listaár, drágább teljes ár)
 *   C  [DEMO] Illat Háza        5 000 Ft, de 60 órája ellenőriztük → nem friss, a lista végén, nem lehet legjobb
 */
const sql = postgres(process.env.DATABASE_URL!, { max: 2, prepare: false, onnotice: () => {} })
const slug = `e2e-rozsas-arcszerum-${Date.now()}`

test.beforeAll(async () => {
  const merchant = async (s: string) => (await sql<{ id: string }[]>`select id from public.merchants where slug = ${s}`)[0]!.id
  const [cat] = await sql<{ id: string }[]>`select id from public.categories where path = 'szepsegapolas/arcapolas/szerum'`
  const [brand] = await sql<{ id: string }[]>`select id from public.brands where slug = 'hajnalpir'`
  const [p] = await sql<{ id: string }[]>`
    insert into public.products (slug, name, brand_id, brand_name, category_id, category_text, description_clean, gtin, size_value, size_unit)
    values (${slug}, 'Hajnalpír Rózsás arcszérum <b>30 ml</b>', ${brand!.id}, 'Hajnalpír', ${cat!.id}, 'Szépségápolás Arcápolás Szérum',
      ${'Könnyű, gyorsan beszívódó szérum rózsavízzel.\n<script>alert(1)</script> Reggel és este is használható.'}, '5998330255724', 30, 'ml')
    returning id`
  await sql`insert into public.product_tags (product_id, tag, source) values (${p!.id}, 'skin_type:szaraz', 'rule'), (${p!.id}, 'free_from:illatanyag', 'rule')`
  const offer = async (m: string, sku: string, price: number, hoursAgo: number) =>
    (
      await sql<{ id: string }[]>`
        insert into public.offers (product_id, merchant_id, merchant_sku, url, price_huf, in_stock, last_seen_at)
        values (${p!.id}, ${await merchant(m)}, ${sku}, ${`https://napfeny-drogeria.example/${sku}`}, ${price}, true,
          now() - make_interval(hours => ${hoursAgo}))
        returning id`
    )[0]!.id
  const a = await offer('demo-napfeny-drogeria', `${slug}-a`, 9000, 1)
  await offer('demo-borkert-patika', `${slug}-b`, 8700, 2)
  await offer('demo-illat-haza', `${slug}-c`, 5000, 60)
  await sql`
    insert into public.price_daily (offer_id, day, price_min_huf, price_last_huf, in_stock_any)
    select ${a}, ((now() at time zone 'Europe/Budapest')::date - g), 10000, 10000, true from generate_series(1, 20) g`
  await sql`select * from public.refresh_catalog_stats(now())`
})

test.afterAll(async () => {
  await sql`delete from public.products where slug = ${slug}`
  await sql.end()
})

async function dismissConsent(page: Page) {
  const btn = page.getByRole('button', { name: 'Csak a szükségesek' })
  if (await btn.isVisible().catch(() => false)) await btn.click()
}

/** Minden forintösszeg (szám + „Ft”) PriceBlock-on belül van (F5 elfogadási kritérium). */
async function ftOutsidePriceBlock(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const bad: string[] = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      const text = node.textContent ?? ''
      if (!/(^|[\s \d])Ft\b/u.test(text)) continue
      const el = node.parentElement
      if (!el || el.closest('script, style, noscript, [data-price-block]')) continue
      bad.push(text.trim())
    }
    return bad
  })
}

test.describe('termékoldal (/termek/[slug])', () => {
  test('legjobb ajánlat a TELJES ár szerint, bontással, frissességgel, jelöléssel; ítélet magyarázattal', async ({ page }) => {
    const res = await page.goto(`/termek/${slug}`)
    expect(res?.status()).toBe(200)
    await dismissConsent(page)
    // a feed szövege szövegként: a <b> nem markup
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rózsás arcszérum <b>30 ml</b>')
    const best = page.locator('[data-best-offer]')
    await expect(best.locator('[data-price-block="l"]')).toContainText('9 990 Ft')
    await expect(best).toContainText('Teljes ár, szállítással együtt')
    await expect(best).toContainText('9 000 Ft + 990 Ft szállítás')
    await expect(best).toContainText('[DEMO] Napfény Drogéria')
    await expect(best).toContainText(/ár ellenőrizve/)
    await expect(best.locator('[data-verdict="deal"]')).toHaveText('Valódi akció')
    await expect(best).toContainText('30 napja nem volt ilyen olcsó ennél a boltnál.')
    // a bolt-gomb a követett átirányítóra visz (5. vasszabály), mellette a jelölés (3. vasszabály)
    const cta = best.locator('[data-cta="best-offer"]')
    await expect(cta).toHaveAttribute('href', /^\/go\/[0-9a-f-]{36}\?placement=best_offer$/)
    await expect(cta).toHaveAttribute('rel', /sponsored/)
    await expect(best.locator('[data-disclosure]')).toContainText('Partnerlink: ha vásárolsz, jutalékot kaphatunk.')
    // „Miért neked” (vendégnél: az ítélet)
    await expect(page.getByText('30 napja nem volt ilyen olcsó', { exact: true })).toBeVisible()
    // a leírás tisztítva, szövegként
    await expect(page.getByText('Reggel és este is használható.', { exact: false })).toBeVisible()
    expect(await page.locator('[data-product-page] script:not([type="application/ld+json"])').count()).toBe(0)
  })

  test('összes ajánlat teljes ár szerint; a 48 óránál régebbi a végén, „nem friss” jelöléssel; minden gomb mellett jelölés', async ({ page }) => {
    await page.goto(`/termek/${slug}`)
    const rows = page.locator('[data-offer-list] [data-offer-row]')
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(0)).toContainText('[DEMO] Napfény Drogéria')
    await expect(rows.nth(0)).toContainText('9 990 Ft')
    await expect(rows.nth(1)).toContainText('[DEMO] Bőrkert Patika')
    await expect(rows.nth(1)).toContainText('10 190 Ft')
    await expect(rows.nth(2)).toContainText('[DEMO] Illat Háza')
    await expect(rows.nth(2)).toContainText('Az ár nem friss')
    await expect(rows.nth(2)).not.toHaveAttribute('data-offer-fresh', 'true')
    for (const row of await rows.all()) {
      await expect(row.getByRole('link', { name: /Megnézem a boltban/ })).toHaveAttribute('href', /^\/go\/[0-9a-f-]{36}\?placement=offer_list$/)
      await expect(row.locator('[data-disclosure]')).toBeVisible()
    }
    // minden webshopba vivő gomb mellett ott a jelölés az oldalon
    const ctas = await page.locator('a[href^="/go/"]').count()
    expect(await page.locator('[data-disclosure]').count()).toBeGreaterThanOrEqual(ctas)
  })

  test('ártörténet: boltonként, 30/90 nap váltó, 30 napos minimum', async ({ page }) => {
    await page.goto(`/termek/${slug}`)
    await dismissConsent(page)
    await page.getByRole('heading', { name: 'Ártörténet' }).scrollIntoViewIfNeeded()
    const chart = page.locator('[data-price-history]')
    await expect(chart).toBeVisible()
    await expect(chart.getByRole('button', { name: '30 nap' })).toHaveAttribute('aria-pressed', 'true')
    await chart.getByRole('button', { name: '90 nap' }).click()
    await expect(chart.getByRole('button', { name: '90 nap' })).toHaveAttribute('aria-pressed', 'true')
    await expect(chart).toContainText('30 napos minimum')
  })

  test('műveletek: célár-választó −5/−10/−20%; vendégnél (waitlist módban) a várólistára visz', async ({ page }) => {
    await page.goto(`/termek/${slug}`)
    await dismissConsent(page)
    await page.getByRole('button', { name: 'Szólj, ha olcsóbb lesz' }).click()
    const dialog = page.getByRole('dialog', { name: 'Mikor szóljunk?' })
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('[data-alert-target]')).toHaveCount(3)
    // −10% a 9 990 Ft-os teljes árból: 8 991 Ft
    await expect(dialog.locator('[data-alert-target="10"]')).toContainText('8 991 Ft')
    await expect(dialog.locator('[data-alert-target="10"]')).toHaveAttribute('href', '/#varolista')
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-action="list"]')).toHaveAttribute('href', '/#varolista')
    await expect(page.locator('[data-action="shelf"]')).toBeVisible()
  })

  test('JSON-LD csak valós mezőkből: friss listaárak, értékelés nélkül', async ({ page }) => {
    await page.goto(`/termek/${slug}`)
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent()
    const ld = JSON.parse(raw!)
    expect(ld).toMatchObject({
      '@type': 'Product',
      name: 'Hajnalpír Rózsás arcszérum <b>30 ml</b>',
      brand: { name: 'Hajnalpír' },
      gtin13: '5998330255724',
      offers: { '@type': 'AggregateOffer', priceCurrency: 'HUF', lowPrice: 8700, highPrice: 9000, offerCount: 2 },
    })
    expect(raw).not.toMatch(/aggregateRating|review|<\/script/i)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`/termek/${slug}$`))
  })

  test('ismeretlen termék 404; 390 px-en nincs vízszintes túllógás', async ({ page }) => {
    expect((await page.goto('/termek/nincs-ilyen-termek'))?.status()).toBe(404)
    await page.goto(`/termek/${slug}`)
    const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
    expect(scroll).toBeLessThanOrEqual(client)
  })
})

test.describe('„Ft” csak PriceBlock-ban (1. és 6. vasszabály)', () => {
  test('landing, keresés, kategória, útmutató, termékoldal, „Így rangsorolunk”', async ({ page }) => {
    const pages = [
      '/',
      '/kereses?q=szerum',
      '/kereses?q=szerum&ar_min=5000&ar_max=14999',
      '/kereses?ar_max=4999',
      '/kategoria/szepsegapolas',
      '/utmutatok/az-elso-szerumod-5-biztos-valasztas',
      `/termek/${slug}`,
      '/igy-rangsorolunk',
    ]
    for (const path of pages) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      expect(await ftOutsidePriceBlock(page), path).toEqual([])
    }
  })
})
