/**
 * Teszt-session a helyi Supabase Authtal (GoTrue): felhasználó jelszóval, igény szerint admin-szerep és TOTP-MFA
 * (aal2). A sütiket maga a `@supabase/ssr` állítja elő, így ugyanazt a formátumot kapjuk, amit az alkalmazás olvas.
 */
import { createHmac, randomUUID } from 'node:crypto'
import { createServerClient } from '@supabase/ssr'
import type { BrowserContext } from '@playwright/test'
import postgres from 'postgres'

const env = (k: string) => {
  const v = process.env[k]
  if (!v) throw new Error(`Hiányzó környezeti változó az e2e-hez: ${k} (pnpm test:e2e:local)`)
  return v
}

function base32Decode(s: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const ch of s.replace(/=+$/, '').toUpperCase()) bits += alphabet.indexOf(ch).toString(2).padStart(5, '0')
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}

/** RFC 6238 TOTP (SHA-1, 6 számjegy, 30 s). */
export function totp(secret: string, now = Date.now()): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / 30)))
  const h = createHmac('sha1', base32Decode(secret)).update(counter).digest()
  const o = h[h.length - 1]! & 0xf
  const code = ((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).toString()
  return code.padStart(6, '0')
}

async function gotrue<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const base = env('NEXT_PUBLIC_SUPABASE_URL')
  const res = await fetch(`${base}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: env('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      authorization: `Bearer ${init.token ?? env('NEXT_PUBLIC_SUPABASE_ANON_KEY')}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`GoTrue ${path}: ${res.status} ${body}`)
  return JSON.parse(body) as T
}

interface Session {
  access_token: string
  refresh_token: string
}

export async function createTestUser(opts: { admin?: boolean; mfa?: boolean } = {}) {
  const email = `e2e-${randomUUID().slice(0, 8)}@teszt.local`
  const password = `Jelszo-${randomUUID()}`
  const service = env('SUPABASE_SERVICE_ROLE_KEY')
  const user = await gotrue<{ id: string }>('/admin/users', {
    method: 'POST',
    token: service,
    headers: { apikey: service },
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  const sql = postgres(env('DATABASE_URL'), { max: 1, prepare: false, onnotice: () => {} })
  await sql`insert into public.profiles (user_id, role) values (${user.id}, ${opts.admin ? 'admin' : 'user'})
    on conflict (user_id) do update set role = excluded.role`
  await sql.end()

  let session = await gotrue<Session>('/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) })
  if (opts.mfa) {
    const factor = await gotrue<{ id: string; totp: { secret: string } }>('/factors', {
      method: 'POST',
      token: session.access_token,
      body: JSON.stringify({ factor_type: 'totp', friendly_name: `e2e-${Date.now()}` }),
    })
    const challenge = await gotrue<{ id: string }>(`/factors/${factor.id}/challenge`, { method: 'POST', token: session.access_token })
    session = await gotrue<Session>(`/factors/${factor.id}/verify`, {
      method: 'POST',
      token: session.access_token,
      body: JSON.stringify({ challenge_id: challenge.id, code: totp(factor.totp.secret) }),
    })
  }
  return { id: user.id, email, session }
}

const CHUNK = 3180

/** A session-süti(k) tartalmának módosítása (a @supabase/ssr `base64-` formátuma, darabolva is). */
function editSessionCookies(jar: { name: string; value: string }[], edit: (s: Record<string, unknown>) => void) {
  const auth = jar.filter((c) => c.name.includes('-auth-token')).sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
  if (!auth.length) return jar
  const base = auth[0]!.name.replace(/\.\d+$/, '')
  const raw = auth.map((c) => c.value).join('')
  const json = JSON.parse(Buffer.from(raw.replace(/^base64-/, ''), 'base64url').toString('utf8')) as Record<string, unknown>
  edit(json)
  const value = `base64-${Buffer.from(JSON.stringify(json)).toString('base64url')}`
  const rest = jar.filter((c) => !c.name.includes('-auth-token'))
  if (value.length <= CHUNK) return [...rest, { name: base, value }]
  const chunks = []
  for (let i = 0; i * CHUNK < value.length; i++) chunks.push({ name: `${base}.${i}`, value: value.slice(i * CHUNK, (i + 1) * CHUNK) })
  return [...rest, ...chunks]
}

/**
 * A session sütijeinek beállítása a böngésző-kontextusban (a @supabase/ssr formátumában).
 * `expired`: a sütiben a session lejártnak látszik (a proxy-nak frissítenie kell).
 */
export async function signIn(context: BrowserContext, baseURL: string, session: Session, opts: { expired?: boolean } = {}) {
  const jar: { name: string; value: string }[] = []
  const client = createServerClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    cookies: {
      getAll: () => jar,
      setAll: (list) => {
        for (const c of list) {
          const i = jar.findIndex((x) => x.name === c.name)
          if (i >= 0) jar.splice(i, 1)
          if (c.value) jar.push({ name: c.name, value: c.value })
        }
      },
    },
  })
  const { error } = await client.auth.setSession(session)
  if (error) throw error
  const cookies = opts.expired ? editSessionCookies(jar, (s) => (s.expires_at = Math.floor(Date.now() / 1000) - 60)) : jar
  const url = new URL(baseURL)
  await context.addCookies(cookies.map((c) => ({ name: c.name, value: c.value, domain: url.hostname, path: '/', httpOnly: false, sameSite: 'Lax' as const })))
}
