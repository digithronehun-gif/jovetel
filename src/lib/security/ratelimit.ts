/**
 * Csúszó ablakos rate limit (CLAUDE.md 11. pont): Upstash Redis, ha be van állítva; egyébként
 * folyamaton belüli memória (fejlesztéshez és teszthez — több szerverpéldánynál nem véd!).
 */
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export interface LimitRule {
  /** egyedi név a kulcstérhez, pl. 'waitlist' */
  name: string
  limit: number
  windowSec: number
}

/** A spec szerinti szabályok (ARCHITECTURE 8. pont). */
export const RULES = {
  waitlist: { name: 'waitlist', limit: 5, windowSec: 3600 },
  loginLink: { name: 'login-link', limit: 5, windowSec: 3600 },
  go: { name: 'go', limit: 60, windowSec: 60 },
  reserve: { name: 'reserve', limit: 10, windowSec: 3600 },
  aiGuest: { name: 'ai-guest', limit: 10, windowSec: 3600 },
  aiMember: { name: 'ai-member', limit: 40, windowSec: 3600 },
  search: { name: 'search', limit: 120, windowSec: 60 },
  consent: { name: 'consent', limit: 30, windowSec: 60 },
} as const satisfies Record<string, LimitRule>

export interface LimitResult {
  ok: boolean
  remaining: number
  resetAt: number
}

const memory = new Map<string, number[]>()

function memoryLimit(key: string, rule: LimitRule, now = Date.now()): LimitResult {
  const windowMs = rule.windowSec * 1000
  const hits = (memory.get(key) ?? []).filter((t) => t > now - windowMs)
  const ok = hits.length < rule.limit
  if (ok) hits.push(now)
  memory.set(key, hits)
  return { ok, remaining: Math.max(0, rule.limit - hits.length), resetAt: (hits[0] ?? now) + windowMs }
}

let redis: Redis | null | undefined
const limiters = new Map<string, Ratelimit>()

function upstash(rule: LimitRule): Ratelimit | null {
  if (redis === undefined) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    redis = url && token ? new Redis({ url, token }) : null
  }
  if (!redis) return null
  let l = limiters.get(rule.name)
  if (!l) {
    l = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowSec} s`),
      prefix: `jv:rl:${rule.name}`,
      analytics: false,
    })
    limiters.set(rule.name, l)
  }
  return l
}

export async function rateLimit(rule: LimitRule, identifier: string): Promise<LimitResult> {
  if (process.env.RATE_LIMIT_DISABLED === 'true' && process.env.NODE_ENV !== 'production') {
    return { ok: true, remaining: rule.limit, resetAt: Date.now() }
  }
  const l = upstash(rule)
  if (l) {
    const r = await l.limit(identifier)
    return { ok: r.success, remaining: r.remaining, resetAt: r.reset }
  }
  return memoryLimit(`${rule.name}:${identifier}`, rule)
}

/** Csak teszthez. */
export function __resetMemoryLimits() {
  memory.clear()
}
