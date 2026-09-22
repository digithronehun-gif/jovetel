/**
 * pnpm screenshots -- [útvonal ...] [--base http://localhost:3000] [--out tests/.artifacts/screens]
 * Playwright-képernyőkép 390 és 1440 px szélességben, világos és sötét módban (CLAUDE.md 7.8).
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

const args = process.argv.slice(2)
function opt(name: string, fallback: string): string {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback
}
const base = opt('--base', process.env.SCREENSHOT_BASE ?? 'http://localhost:3000')
const out = opt('--out', 'tests/.artifacts/screens')
const fullPage = !args.includes('--viewport-only')
const routes = args.filter(
  (a, i) => !a.startsWith('--') && !['--base', '--out'].includes(args[i - 1] ?? ''),
)
if (routes.length === 0) routes.push('/')

const widths = [390, 1440] as const
const schemes = ['light', 'dark'] as const

async function main() {
  mkdirSync(out, { recursive: true })
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium',
  })
  for (const route of routes) {
    for (const width of widths) {
      for (const colorScheme of schemes) {
        const ctx = await browser.newContext({
          viewport: { width, height: width === 390 ? 844 : 900 },
          deviceScaleFactor: 1,
          colorScheme,
          reducedMotion: 'reduce',
          locale: 'hu-HU',
          timezoneId: 'Europe/Budapest',
        })
        const page = await ctx.newPage()
        await page.goto(base + route, { waitUntil: 'networkidle' })
        // lusta képek betöltése: végiggörgetjük az oldalt
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 600) {
            window.scrollTo(0, y)
            await new Promise((r) => setTimeout(r, 60))
          }
          window.scrollTo(0, 0)
        })
        await page.waitForLoadState('networkidle')
        await page.evaluate(() => document.fonts.ready)
        const name = `${route === '/' ? 'root' : route.replace(/^\//, '').replace(/[/?=&]+/g, '_')}-${width}-${colorScheme}.png`
        await page.screenshot({ path: join(out, name), fullPage })
        console.log(join(out, name))
        await ctx.close()
      }
    }
  }
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
