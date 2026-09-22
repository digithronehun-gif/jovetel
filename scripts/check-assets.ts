/**
 * pnpm check:assets — melyik képhely használ még moodboard-dev-only képet, és hol (7. vasszabály).
 *   --enforce   production build módban fut (a `pnpm build` így hívja): ALLOW_DEV_IMAGES=true nélkül
 *               hibával leáll, ha maradt fejlesztési kép.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { assertLicensedForProduction, slotReport, UnlicensedImagesError } from '../src/lib/assets'

const ROOT = join(import.meta.dirname, '..')
const SCAN_DIRS = ['app', 'src', 'emails']
const SKIP = ['src/lib/assets', 'src/content/brand']

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const rel = relative(ROOT, p)
    if (SKIP.some((s) => rel.startsWith(s))) continue
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(tsx?|mdx?)$/.test(name)) out.push(p)
  }
  return out
}

function usages(): Map<string, string[]> {
  const files = SCAN_DIRS.flatMap((d) => {
    try {
      return walk(join(ROOT, d))
    } catch {
      return []
    }
  })
  const map = new Map<string, string[]>()
  const re =
    /['"`]((?:landing|auth|onboarding|app|kategoria|cimzett|alkalom|utmutato|ures|hiba)\.[A-Za-z]+)['"`]/g
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    for (const m of text.matchAll(re)) {
      const slot = m[1]!
      const list = map.get(slot) ?? []
      const rel = relative(ROOT, f)
      if (!list.includes(rel)) list.push(rel)
      map.set(slot, list)
    }
  }
  return map
}

const enforce = process.argv.includes('--enforce')
const report = slotReport({ ctx: { allowDevImages: true, now: new Date() } })
const used = usages()
const dev = report.filter((r) => !r.productionReady)

console.log(`Képhelyek: ${report.length} · fejlesztési (moodboard-dev-only) képen: ${dev.length}\n`)
for (const r of report) {
  const where = used.get(r.slot)?.join(', ') ?? '— (még nincs használva)'
  const flag = r.productionReady ? 'OK ' : 'DEV'
  console.log(`${flag}  ${r.slot.padEnd(24)} ${String(r.imageId).padEnd(26)} ${where}`)
}

if (enforce) {
  const env = { ...process.env, NODE_ENV: 'production' }
  try {
    const { devImagesInUse } = assertLicensedForProduction(env)
    if (devImagesInUse.length > 0) {
      console.warn(
        `\nFIGYELEM: ALLOW_DEV_IMAGES=true tudatos döntéssel ${devImagesInUse.length} képhely fejlesztési képpel épül.`,
      )
    }
  } catch (e) {
    if (e instanceof UnlicensedImagesError) {
      console.error(`\n${e.message}`)
      process.exit(1)
    }
    throw e
  }
}
