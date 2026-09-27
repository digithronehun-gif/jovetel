import { expect, test, type Page } from '@playwright/test'
import postgres from 'postgres'
import { createTestUser, signIn } from './helpers/auth'

/**
 * F4: keresés, kategóriák, útmutatók. A helyi fejlesztői seed adatain fut (pnpm db:seed: 300 [DEMO] termék,
 * 45 nap ártörténet, 3 útmutató-váz).
 */
async function dismissConsent(page: Page) {
  const btn = page.getByRole('button', { name: 'Csak a szükségesek' })
  if (await btn.isVisible().catch(() => false)) await btn.click()
}

async function noHorizontalOverflow(page: Page, label: string) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }))
  expect(scroll, `${label}: vízszintes túllógás`).toBeLessThanOrEqual(client)
}

const resultCount = async (page: Page) => Number((await page.locator('[data-result-count] span').first().innerText()).replace(/\D/g, ''))

test.describe('keresés (/kereses)', () => {
  test('keresőmezőből: találatok, a szöveg az URL-ben, ékezet nélkül és elírással is', async ({ page }) => {
    await page.goto('/kereses')
    await dismissConsent(page)
    await page.getByRole('searchbox', { name: 'Mit keresel?' }).fill('hialuronsavas szerum')
    await page.getByRole('button', { name: 'Keresés', exact: true }).click()
    await expect(page).toHaveURL(/\/kereses\?q=hialuronsavas\+szerum$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('„hialuronsavas szerum”')
    const cards = page.locator('[data-results] [data-product-card]')
    await expect(cards.first()).toBeVisible()
    await expect(cards.first()).toContainText(/hialuronsav/i)
    // minden ár PriceBlock-ban, „ár ellenőrizve” jelöléssel (6. vasszabály)
    expect(await page.locator('[data-results] [data-price-block]').count()).toBe(await cards.count())
    await expect(cards.first()).toContainText('ár ellenőrizve')

    await page.goto('/kereses?q=hialuronsavs')
    await expect(page.locator('[data-results] [data-product-card]').first()).toContainText(/hialuronsav/i)
  })

  test('mobilon a szűrők alsó lapban: bőrtípus kiválasztása, az állapot az URL-ben, chip-pel törölhető', async ({ page }) => {
    await page.goto('/kereses?q=szerum')
    await dismissConsent(page)
    const before = await resultCount(page)
    await page.locator('[data-filter-open]').click()
    const sheet = page.getByRole('dialog', { name: 'Szűrők' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('link', { name: /^Zsíros/ }).click()
    await expect(page).toHaveURL(/bor=zsiros/)
    // a lap nyitva marad és frissül; a gomb a találatszámot mutatja
    await expect(sheet.getByRole('link', { name: /^Zsíros/ })).toHaveAttribute('aria-current', 'true')
    const after = await resultCount(page)
    expect(after).toBeGreaterThan(0)
    expect(after).toBeLessThanOrEqual(before)
    await sheet.getByRole('button', { name: /találat mutatása/ }).click()
    await expect(sheet).toBeHidden()
    await expect(page.locator('[data-filter-open]')).toContainText('(1)')

    // újratöltés után is ugyanaz (URL-ben tárolt állapot)
    await page.reload()
    expect(await resultCount(page)).toBe(after)
    await page.locator('[data-active-filters]').getByRole('link', { name: /Zsíros bőr/ }).click()
    await expect(page).not.toHaveURL(/bor=/)
    expect(await resultCount(page)).toBe(before)
    await noHorizontalOverflow(page, '/kereses szűrővel')
  })

  test('rendezés: legalacsonyabb teljes ár szerint növekvő sorrend', async ({ page }) => {
    await page.goto('/kereses?q=szerum')
    await dismissConsent(page)
    await page.getByLabel('Rendezés').selectOption('ar')
    await expect(page).toHaveURL(/rendezes=ar/)
    const prices = await page.locator('[data-results] [data-price-block] > p:nth-child(1)').allInnerTexts()
    const values = prices.map((p) => Number(p.replace(/\D/g, '')))
    expect(values.length).toBeGreaterThan(2)
    expect([...values].sort((a, b) => a - b)).toEqual(values)
  })

  test('valódi akció szűrő: csak „Valódi akció” jelölésű termékek; ársáv a teljes árra', async ({ page }) => {
    await page.goto('/kereses?akcio=1')
    await dismissConsent(page)
    const cards = page.locator('[data-results] [data-product-card]')
    const n = await cards.count()
    expect(n).toBeGreaterThan(0)
    for (let i = 0; i < n; i++) await expect(cards.nth(i)).toContainText('Valódi akció')

    await page.goto('/kereses?ar_min=5000&ar_max=14999')
    const totals = await page.locator('[data-results] [data-price-block] > p:nth-child(1)').allInnerTexts()
    for (const t of totals) {
      const v = Number(t.replace(/\D/g, ''))
      expect(v).toBeGreaterThanOrEqual(5000)
      expect(v).toBeLessThanOrEqual(14999)
    }
  })

  test('üres találat: a spec szerinti szöveg és a legszűkebb szűrő lazítása', async ({ page }) => {
    await page.goto('/kereses?q=szerum&ar_max=100')
    await dismissConsent(page)
    await expect(page.getByRole('heading', { name: 'Erre nem találtunk terméket.' })).toBeVisible()
    const relax = page.getByRole('link', { name: /Az ár-szűrő nélkül: \d+ termék/ })
    await expect(relax).toBeVisible()
    await relax.click()
    await expect(page).not.toHaveURL(/ar_max/)
    expect(await resultCount(page)).toBeGreaterThan(0)

    await page.goto('/kereses?q=xqzvwk')
    await expect(page.getByRole('heading', { name: 'Erre nem találtunk terméket.' })).toBeVisible()
  })

  test('lapozás, és hibás URL-paraméterre nincs hibaoldal', async ({ page }) => {
    await page.goto('/kereses')
    await dismissConsent(page)
    await page.getByRole('navigation', { name: 'Lapozás' }).getByRole('link', { name: 'Következő oldal' }).click()
    await expect(page).toHaveURL(/oldal=2/)
    await expect(page.locator('[aria-current="page"]', { hasText: '2' })).toBeVisible()
    const res = await page.goto("/kereses?rendezes=jutalek&oldal=-1&bor=<script>&ar_min=abc")
    expect(res?.status()).toBe(200)
    await expect(page.locator('[data-results]')).toBeVisible()
  })

  test('desktopon a szűrők a bal oszlopban, a keresési oldal nem indexelődik', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/kereses?q=szerum')
    await expect(page.getByRole('complementary', { name: 'Szűrők' })).toBeVisible()
    await expect(page.locator('[data-filter-open]')).toBeHidden()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })

  test('GET /api/search: JSON a keresés adataival, jutalék nélkül', async ({ request }) => {
    const res = await request.get('/api/search?q=szerum&rendezes=ar')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.total).toBeGreaterThan(0)
    expect(body.hits[0]).toMatchObject({ url: expect.stringMatching(/^\/termek\//), cost: { totalHuf: expect.any(Number) } })
    expect(JSON.stringify(body)).not.toMatch(/commission|jutal/i)
  })
})

test.describe('kategóriák', () => {
  test('áttekintő → kategória: morzsamenü, alkategóriák számokkal, képhelyes fejléc; ismeretlen útvonal 404', async ({ page }) => {
    await page.goto('/kategoria')
    await dismissConsent(page)
    await page.getByRole('link', { name: 'Arcápolás' }).first().click()
    await expect(page).toHaveURL(/\/kategoria\/szepsegapolas\/arcapolas$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Arcápolás')
    await expect(page.getByRole('navigation', { name: 'Morzsamenü' })).toContainText('Szépségápolás')
    const subs = page.getByRole('list', { name: 'Alkategóriák' })
    await expect(subs.getByRole('link', { name: /Szérum/ })).toBeVisible()
    await subs.getByRole('link', { name: /Szérum/ }).click()
    await expect(page).toHaveURL(/\/kategoria\/szepsegapolas\/arcapolas\/szerum$/)
    // a kanonikus URL a szűretlen kategória; szűrővel nem indexelődik
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/kategoria\/szepsegapolas\/arcapolas\/szerum$/)
    await page.goto('/kategoria/szepsegapolas/arcapolas/szerum?keszleten=1')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    expect((await page.goto('/kategoria/nincs-ilyen'))?.status()).toBe(404)
  })

  test('390 px-en egyik katalógusoldal sem lóg ki vízszintesen', async ({ page }) => {
    for (const path of ['/kereses', '/kereses?q=szerum&bor=zsiros', '/kategoria', '/kategoria/szepsegapolas', '/utmutatok']) {
      await page.goto(path)
      await noHorizontalOverflow(page, path)
    }
  })
})

test.describe('útmutatók', () => {
  test('szerkesztő → közzététel → a nyilvános oldalon; kevés szöveggel noindex; minden írás naplózva', async ({ page, context, baseURL }) => {
    const u = await createTestUser({ admin: true, mfa: true })
    await signIn(context, baseURL!, u.session)
    const title = `E2E útmutató ${Date.now()}`
    await page.goto('/admin/utmutatok')
    await dismissConsent(page)
    await page.getByLabel('Új útmutató címe').fill(title)
    await page.getByRole('button', { name: 'Létrehozás' }).click()
    await expect(page).toHaveURL(/\/admin\/utmutatok\/[0-9a-f-]{36}$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
    await expect(page.locator('[data-guide-status]')).toHaveText('Vázlat')

    await page.getByLabel('Bevezető').fill('Első bekezdés a <b>szérumokról</b>.\n\nMásodik bekezdés.')
    await page.getByRole('button', { name: 'Mentés', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Mentve.')

    await page.getByRole('searchbox', { name: /Termék hozzáadása/ }).fill('szerum')
    await page.getByRole('button', { name: 'Keresés', exact: true }).click()
    const results = page.locator('[data-guide-product-results]')
    await results.getByRole('button', { name: 'Hozzáadás' }).first().click()
    await expect(page.locator('[data-guide-items] > li')).toHaveCount(1)
    await page.locator('[data-guide-items] textarea[name="note"]').first().fill('Könnyű, jól rétegezhető.')
    await page.getByRole('button', { name: 'Megjegyzés mentése' }).click()
    await expect(page.locator('[data-guide-indexable]')).toContainText('nem')

    await page.getByRole('button', { name: 'Közzététel' }).click()
    await expect(page.locator('[data-guide-status]')).toHaveText('Közzétéve')
    await page.getByRole('link', { name: 'Megnyitás az oldalon' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
    // a szerkesztői szöveg szövegként jelenik meg, nem markupként
    await expect(page.getByText('Első bekezdés a <b>szérumokról</b>.')).toBeVisible()
    expect(await page.locator('article b').count()).toBe(0)
    await expect(page.locator('[data-guide-items] [data-product-card]')).toHaveCount(1)
    await expect(page.getByText('Könnyű, jól rétegezhető.')).toBeVisible()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

    await page.goto('/utmutatok')
    await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible()

    const sql = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} })
    try {
      const actions = await sql<{ action: string }[]>`
        select action from public.audit_log where actor_user_id = ${u.id} order by created_at`
      expect(actions.map((a) => a.action)).toEqual(['guide.create', 'guide.update', 'guide.item_add', 'guide.item_note', 'guide.publish'])
      await sql`delete from public.lists where title = ${title}`
    } finally {
      await sql.end()
    }
  })

  test('nem admin: a szerkesztő 404; a vázlat nyilvánosan nem érhető el', async ({ page, context, baseURL }) => {
    expect((await page.goto('/admin/utmutatok'))?.status()).toBe(404)
    const u = await createTestUser()
    await signIn(context, baseURL!, u.session)
    expect((await page.goto('/admin/utmutatok'))?.status()).toBe(404)
    expect((await page.goto('/utmutatok/nincs-ilyen-utmutato'))?.status()).toBe(404)
  })
})
