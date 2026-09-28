/**
 * Rate limit szerveroldali oldalakra (nem csak API-ra): a keresési és kategóriaoldal egy kérése több lekérdezést futtat,
 * ezért a limit az oldal renderelése előtt dől el (F6-átnézés). Az azonosító a sózott IP-hash (CLAUDE.md 10. pont).
 */
import 'server-only'
import { headers } from 'next/headers'
import { clientIp, hashIdentifier } from './ip'
import { rateLimit, type LimitRule } from './ratelimit'

export async function pageRateLimited(rule: LimitRule): Promise<boolean> {
  const h = await headers()
  const r = await rateLimit(rule, hashIdentifier(clientIp(h)))
  return !r.ok
}
