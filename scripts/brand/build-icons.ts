/**
 * pnpm tsx scripts/brand/build-icons.ts — favicon és app-ikonok a J monogramból.
 * Kimenet: app/icon.svg (világos/sötét), app/apple-icon.png (180), public/icons/icon-{192,512}.png,
 * public/icons/maskable-512.png. A színek a palette.ts-ből (a tokenek tükre).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { MONOGRAM } from '../../src/components/brand/glyphs.generated'
import { palette } from '../../src/lib/brand/palette'

const ROOT = join(import.meta.dirname, '../..')
const { path, ray } = MONOGRAM

function svg({
  size,
  padding,
  rounded,
  dark,
}: {
  size: number
  padding: number
  rounded: boolean
  dark?: boolean
}) {
  // A J (38–962 × 0–1561) + a sugár a jobb felső sarokban: tartalomdoboz kb. -60…1240 × -460…1561
  const content = { x: -40, y: -470, w: 1300, h: 2060 }
  const side = Math.max(content.w, content.h) / (1 - 2 * padding)
  const x0 = content.x + content.w / 2 - side / 2
  const y0 = content.y + content.h / 2 - side / 2
  const bg = dark ? palette.dark.paper : palette.light.peach
  const ink = dark ? palette.dark.ink : palette.light.ink
  const amber = dark ? palette.dark.amber : palette.light.amber
  const r = rounded ? side * 0.22 : 0
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${x0} ${y0} ${side} ${side}">
<rect x="${x0}" y="${y0}" width="${side}" height="${side}" rx="${r}" fill="${bg}"/>
<path d="${path}" fill="${ink}"/>
<line x1="${ray.x1}" y1="${ray.y1}" x2="${ray.x2}" y2="${ray.y2}" stroke="${amber}" stroke-width="${ray.width}" stroke-linecap="round"/>
</svg>`
}

// Favicon: rendszer-témát követő SVG
const content = { x: -40, y: -470, w: 1300, h: 2060 }
const side = content.h / 0.84
const x0 = content.x + content.w / 2 - side / 2
const y0 = content.y + content.h / 2 - side / 2
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${side} ${side}">
<style>
  .bg { fill: ${palette.light.peach} } .ink { fill: ${palette.light.ink} } .ray { stroke: ${palette.light.amber} }
  @media (prefers-color-scheme: dark) { .bg { fill: ${palette.dark.peach} } .ink { fill: ${palette.dark.ink} } .ray { stroke: ${palette.dark.amber} } }
</style>
<rect class="bg" x="${x0}" y="${y0}" width="${side}" height="${side}" rx="${side * 0.22}"/>
<path class="ink" d="${path}"/>
<line class="ray" x1="${ray.x1}" y1="${ray.y1}" x2="${ray.x2}" y2="${ray.y2}" stroke-width="${ray.width}" stroke-linecap="round"/>
</svg>
`
writeFileSync(join(ROOT, 'app/icon.svg'), favicon)

async function png(svgText: string, size: number, out: string) {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium',
  })
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  })
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svgText}</body></html>`,
  )
  await page.locator('svg').screenshot({ path: out, omitBackground: true })
  await browser.close()
}

mkdirSync(join(ROOT, 'public/icons'), { recursive: true })
await png(svg({ size: 180, padding: 0.12, rounded: false }), 180, join(ROOT, 'app/apple-icon.png'))
await png(
  svg({ size: 192, padding: 0.12, rounded: true }),
  192,
  join(ROOT, 'public/icons/icon-192.png'),
)
await png(
  svg({ size: 512, padding: 0.12, rounded: true }),
  512,
  join(ROOT, 'public/icons/icon-512.png'),
)
await png(
  svg({ size: 512, padding: 0.22, rounded: false }),
  512,
  join(ROOT, 'public/icons/maskable-512.png'),
)
console.log('Ikonok elkészültek: app/icon.svg, app/apple-icon.png, public/icons/*')
