// Lighthouse mobil mérés több futással, kategóriánként medián (a futások szórása nagy).
//   node scripts/perf/lighthouse.mjs <url> [--runs 5] [--out dir]
// A Chromium útvonala: CHROME_PATH (alapértelmezés: /opt/pw-browsers/chromium).
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const url = process.argv[2]
if (!url) {
  console.error('Használat: node scripts/perf/lighthouse.mjs <url> [--runs 5] [--out dir]')
  process.exit(1)
}
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : def
}
const runs = Number(arg('runs', '5'))
const out = arg('out', join(import.meta.dirname, '../../tests/.artifacts/lighthouse'))
mkdirSync(out, { recursive: true })
const chrome = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium'
const bin = join(import.meta.dirname, '../../node_modules/.bin/lighthouse')
const slug = new URL(url).pathname.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'kezdolap'

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}
const results = []
for (let i = 1; i <= runs; i++) {
  const file = join(out, `${slug}-${i}.json`)
  execFileSync(
    bin,
    [url, '--quiet', `--chrome-flags=--headless=new --no-sandbox --ignore-certificate-errors`, '--only-categories=performance,accessibility,best-practices,seo', '--output=json', `--output-path=${file}`],
    { env: { ...process.env, CHROME_PATH: chrome }, stdio: 'ignore' },
  )
  const r = JSON.parse(readFileSync(file, 'utf8'))
  const row = Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]))
  row.lcp = Math.round(r.audits['largest-contentful-paint'].numericValue)
  row.tbt = Math.round(r.audits['total-blocking-time'].numericValue)
  row.cls = r.audits['cumulative-layout-shift'].numericValue
  results.push(row)
  console.log(`#${i}`, JSON.stringify(row))
}
const keys = Object.keys(results[0])
console.log('MEDIÁN', JSON.stringify(Object.fromEntries(keys.map((k) => [k, median(results.map((r) => r[k]))]))))
