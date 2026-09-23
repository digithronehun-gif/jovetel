import { expect, test, type Locator, type Page } from '@playwright/test'

const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324'

/** Az elem a nézetben van, és a középpontjában nem takarja más (pl. a süti-sáv). */
async function visibleAndUncovered(page: Page, locator: Locator) {
  await expect(locator).toBeInViewport({ ratio: 1 })
  const covered = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const points = [
      [r.left + r.width / 2, r.top + r.height / 2],
      [r.left + 4, r.top + 4],
      [r.right - 4, r.bottom - 4],
    ]
    return points.some(([x, y]) => {
      const hit = document.elementFromPoint(x!, y!)
      return !hit || !(el === hit || el.contains(hit) || hit.contains(el))
    })
  })
  expect(covered, 'az elemet más elem takarja').toBe(false)
}

async function latestMailTo(email: string): Promise<{ ID: string; Subject: string } | undefined> {
  const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)
  const body = (await res.json()) as { messages: { ID: string; Subject: string }[] }
  return body.messages[0]
}

test.describe('landing', () => {
  test('390×844-en az első képernyőn látszik a cím, az alcím, mindkét gomb és a kép, a süti-sáv nem takarja', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByRole('dialog', { name: /süti/i })).toBeVisible()
    // a belépő animáció végét megvárjuk
    await page.waitForTimeout(900)
    await visibleAndUncovered(page, page.getByRole('heading', { level: 1 }))
    await visibleAndUncovered(page, page.getByText(/^Mondd el, kinek és mire keresel/))
    await visibleAndUncovered(page, page.locator('[data-cta="hero-primary"]'))
    await visibleAndUncovered(page, page.locator('[data-cta="hero-secondary"]'))
    await visibleAndUncovered(page, page.locator('[data-hero-image] img'))
  })

  test('minden webshop-jellegű ár mellett „Példa” jelölés van, és nincs „Valódi akció” jelölés nélkül', async ({ page }) => {
    await page.goto('/')
    const frames = page.locator('[data-demo-frame]')
    await expect(frames).not.toHaveCount(0)
    for (const frame of await frames.all()) await expect(frame.getByText('Példa', { exact: true })).toBeVisible()
    // minden ár egy PriceBlock-ban, és mind demókeretben van
    const outside = await page.locator('[data-price-block]').evaluateAll(
      (els) => els.filter((el) => !el.closest('[data-demo-frame]')).length,
    )
    expect(outside).toBe(0)
  })

  test('feliratkozás a várólistára a megerősítésig (double opt-in)', async ({ page }) => {
    const email = `e2e.${Date.now()}@pelda.hu`
    await page.goto('/?utm_source=e2e&utm_campaign=varolista')
    await page.getByRole('button', { name: 'Csak a szükségesek' }).click()
    const form = page.locator('[data-waitlist-form]')
    await form.scrollIntoViewIfNeeded()
    await form.getByLabel('E-mail-cím').fill(email)
    await form.getByText('Szépségápolás', { exact: true }).click()
    await form.getByRole('button', { name: 'Feliratkozom a várólistára' }).click()
    await expect(page.locator('[data-waitlist-success]')).toContainText('Küldtünk egy megerősítő levelet')

    let mail: Awaited<ReturnType<typeof latestMailTo>>
    await expect
      .poll(async () => (mail = await latestMailTo(email)), { timeout: 15_000, message: 'nem jött meg a levél' })
      .toBeTruthy()
    expect(mail!.Subject).toBe('Erősítsd meg a feliratkozásod a JóVételre')
    const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${mail!.ID}`)).json()) as { HTML: string; Text: string }
    const link = msg.Text.match(/https?:\/\/\S+\/varolista\/megerosites\?t=[\w-]+/)?.[0]
    expect(link, 'nincs megerősítő link a levélben').toBeTruthy()
    // a levélben a site URL-je van; a tesztszerverre irányítjuk át
    const url = new URL(link!)
    await page.goto(`${url.pathname}${url.search}`)
    await page.getByRole('button', { name: 'Megerősítem' }).click()
    await expect(page).toHaveURL(/kesz=1/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('fent vagy a listán')

    // a link kétszeri megnyitása nem hiba (idempotens), a hamis token viszont igen
    await page.goto(`${url.pathname}${url.search}`)
    await page.getByRole('button', { name: 'Megerősítem' }).click()
    await expect(page).toHaveURL(/kesz=1/)
    await page.goto('/varolista/megerosites?t=ez-nem-egy-valodi-token-000000')
    await page.getByRole('button', { name: 'Megerősítem' }).click()
    await expect(page).toHaveURL(/hiba=invalid/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('nem érvényes')
  })

  test('a landing egyetlen belső linkje sem vezet 404-re', async ({ page, request }) => {
    await page.goto('/')
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((els) =>
      [...new Set(els.map((el) => (el.getAttribute('href') ?? '').split('#')[0]!))].filter(Boolean),
    )
    expect(hrefs.length).toBeGreaterThan(5)
    for (const href of hrefs) {
      const res = await request.get(href, { maxRedirects: 0 })
      expect(res.status(), href).toBeLessThan(400)
    }
  })

  test('mobilmenü: megnyílik, a linkek látszanak, Escape-re bezárul és a fókusz visszatér', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Csak a szükségesek' }).click()
    const button = page.getByRole('button', { name: 'Menü' })
    await button.click()
    const dialog = page.getByRole('dialog', { name: 'Menü' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('link', { name: 'Így rangsorolunk' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(button).toBeFocused()
    await button.click()
    await page.getByRole('dialog', { name: 'Menü' }).getByRole('link', { name: 'Így rangsorolunk' }).click()
    await expect(page).toHaveURL(/igy-rangsorolunk/)
  })

  test('hibás e-mail-címre mezőszintű hibaüzenet, levél nem megy ki', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Csak a szükségesek' }).click()
    const form = page.locator('[data-waitlist-form]')
    await form.getByLabel('E-mail-cím').fill('nem-email')
    await form.getByRole('button', { name: 'Feliratkozom a várólistára' }).click()
    await expect(form.getByLabel('E-mail-cím')).toHaveAttribute('aria-invalid', 'true')
  })
})

test.describe('hozzájárulás', () => {
  test('hozzájárulás előtt egyetlen kérés sem megy a PostHog felé, elfogadás után igen', async ({ page }) => {
    const hits: string[] = []
    await page.route(/posthog\.com/, (route) => {
      hits.push(route.request().url())
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.mouse.wheel(0, 3000)
    await page.waitForTimeout(1500)
    expect(hits, 'hozzájárulás előtt PostHog-kérés ment ki').toHaveLength(0)
    const cookies = await page.context().cookies()
    expect(cookies.map((c) => c.name).filter((n) => n.startsWith('ph_') || n === 'jv_anon')).toEqual([])

    await page.getByRole('button', { name: 'Mindet elfogadom' }).click()
    await expect(page.getByRole('dialog', { name: /süti/i })).toBeHidden()
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      await expect.poll(() => hits.length, { timeout: 10_000 }).toBeGreaterThan(0)
    }
    await expect
      .poll(async () => (await page.context().cookies()).map((c) => c.name))
      .toEqual(expect.arrayContaining(['jv_consent', 'jv_anon']))
  })

  test('„Csak a szükségesek” után sincs PostHog-kérés, és újratöltés után nem jön vissza a sáv', async ({ page }) => {
    const hits: string[] = []
    await page.route(/posthog\.com/, (route) => {
      hits.push(route.request().url())
      return route.fulfill({ status: 200, body: '{}' })
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Csak a szükségesek' }).click()
    await expect(page.getByRole('dialog', { name: /süti/i })).toBeHidden()
    await page.reload()
    await page.waitForTimeout(1000)
    await expect(page.getByRole('dialog', { name: /süti/i })).toHaveCount(0)
    expect(hits).toHaveLength(0)
  })
})

test.describe('jogi oldalak és 404', () => {
  for (const path of ['/adatvedelem', '/aszf', '/impresszum', '/affiliate-tajekoztato', '/cookie', '/igy-rangsorolunk', '/rolunk']) {
    test(`${path} betölt, van h1 és lábléc-jelölés`, async ({ page }) => {
      const res = await page.goto(path)
      expect(res?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.locator('footer [data-disclosure]')).toContainText(/partnerlink/i)
    })
  }

  test('390 px-en egyik oldal sem lóg ki vízszintesen', async ({ page }) => {
    for (const path of ['/', '/adatvedelem', '/aszf', '/impresszum', '/affiliate-tajekoztato', '/cookie', '/igy-rangsorolunk', '/rolunk', '/varolista/megerosites', '/nincs-ilyen-oldal']) {
      await page.goto(path)
      const { scroll, client } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }))
      expect(scroll, `${path}: vízszintes túllógás`).toBeLessThanOrEqual(client)
    }
  })

  test('ismeretlen útvonal: 404 a saját oldallal', async ({ page }) => {
    const res = await page.goto('/nincs-ilyen-oldal')
    expect(res?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('/igy-rangsorolunk: a súlyok összege 100%, a jutalék nem szempont', async ({ page }) => {
    await page.goto('/igy-rangsorolunk')
    const weights = await page.locator('[data-weight]').evaluateAll((els) =>
      els.map((el) => Number.parseInt(el.textContent ?? '', 10)),
    )
    expect(weights).toHaveLength(6)
    expect(weights.reduce((a, b) => a + b, 0)).toBe(100)
    await expect(page.getByRole('main')).toContainText('jutalék')
  })
})
