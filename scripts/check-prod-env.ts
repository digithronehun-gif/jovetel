/**
 * pnpm build része: production deploynál (VERCEL_ENV / APP_ENV = production) leáll, ha hiányzik a só, a rate limit
 * (Upstash) vagy a CRON_SECRET. Más környezetben nem csinál semmit. Értéket soha nem ír ki.
 */
import { productionEnvProblems } from '../src/lib/security/prodEnv'

const problems = productionEnvProblems()
if (problems.length) {
  console.error('Production build: hiányzó vagy túl rövid beállítás (a Vercel → Settings → Environment Variables alatt):')
  for (const p of problems) console.error(`  - ${p.name}${p.problem === 'too_short' ? ' (legalább 16 karakter)' : ''}`)
  process.exit(1)
}
