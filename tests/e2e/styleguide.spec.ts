import { expect, test, type Page } from '@playwright/test'

/** A node szövegét ténylegesen kirajzoló betűtípusok (Chrome DevTools Protocol). */
async function platformFonts(page: Page, selector: string): Promise<string[]> {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('DOM.enable')
  await cdp.send('CSS.enable')
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 })
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector })
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
  return fonts.map((f) => f.familyName)
}

test.describe('/styleguide', () => {
  test('a „Tűzőgép, őszi fűszál: ŐŰ őű.” mondat minden betűje a saját betűtípusból jön', async ({
    page,
  }) => {
    await page.goto('/styleguide')
    await page.evaluate(() => document.fonts.ready)
    const display = await platformFonts(page, '[data-font="display"]')
    const italic = await platformFonts(page, '[data-font="display-italic"]')
    const sans = await platformFonts(page, '[data-font="sans"]')
    // pontosan egy betűtípus rajzolja a teljes mondatot → az ő/ű nem más fontból jön
    expect(display).toHaveLength(1)
    expect(display[0]).toMatch(/Bodoni Moda/i)
    expect(italic).toHaveLength(1)
    expect(italic[0]).toMatch(/Bodoni Moda/i)
    expect(sans).toHaveLength(1)
    expect(sans[0]).toMatch(/Manrope/i)
  })

  test('a forint nem törő szóközökkel jelenik meg, PriceBlock-on belül', async ({ page }) => {
    await page.goto('/styleguide')
    const price = page.locator('[data-price-block="inline"]').first()
    await expect(price).toHaveText('24 990 Ft')
  })

  test('minden képhely képet mutat, licencjelöléssel', async ({ page }) => {
    await page.goto('/styleguide')
    await expect(page.locator('#kephelyek [data-slot-id]')).toHaveCount(42)
  })
})
