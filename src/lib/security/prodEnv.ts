/**
 * Production-deploy előfeltételek (CLAUDE.md 10–11. pont, F6-átnézés): só nélkül az IP- és UA-hash visszafejthető,
 * Upstash nélkül a rate limit példányonkénti memóriában fut (több szerverpéldánynál nem véd), `CRON_SECRET` nélkül a
 * cron- és revalidációs végpontok nem hitelesíthetők. Production buildben ezek hiánya hibával leállítja a buildet
 * (`scripts/check-prod-env.ts`, a `pnpm build` része). Értéket nem ír ki, csak a változó nevét.
 */
import { deploymentEnv } from '../env'

export interface EnvProblem {
  name: string
  problem: 'missing' | 'too_short'
}

const MIN_SECRET = 16

export function productionEnvProblems(env: Record<string, string | undefined> = process.env): EnvProblem[] {
  if (deploymentEnv(env) !== 'production') return []
  const out: EnvProblem[] = []
  const secret = (name: string) => {
    const v = env[name]
    if (!v) out.push({ name, problem: 'missing' })
    else if (v.length < MIN_SECRET) out.push({ name, problem: 'too_short' })
  }
  secret('IP_HASH_SALT')
  secret('CRON_SECRET')
  for (const name of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) if (!env[name]) out.push({ name, problem: 'missing' })
  return out
}
