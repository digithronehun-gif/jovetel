/**
 * pnpm db:seed — fejlesztői minta-adat. Production környezetben NEM fut (két ellenőrzés:
 * APP_ENV/VERCEL_ENV és az adatbázis `app.environment` beállítása; lásd README → Élesítés).
 */
import postgres from 'postgres'
import { runSeed } from '../../src/lib/db/seed/run'
import { deploymentEnv } from '../../src/lib/env'
import { requireEnv } from '../_env'

if (deploymentEnv() === 'production') {
  console.error(
    'A seed production környezetben nem futtatható (APP_ENV / VERCEL_ENV = production).',
  )
  process.exit(1)
}

const url = process.env.DIRECT_DATABASE_URL || requireEnv('DATABASE_URL')
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} })

async function createAuthUser(email: string): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key) {
    console.warn(`Nincs Supabase admin kulcs: a(z) ${email} felhasználó kimarad.`)
    return null
  }
  const headers = {
    apikey: key,
    authorization: `Bearer ${key}`,
    'content-type': 'application/json',
  }
  const created = await fetch(`${base}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, email_confirm: true }),
  })
  if (created.ok) return ((await created.json()) as { id: string }).id
  // már létezik: megkeressük
  const [row] = await sql<
    { id: string }[]
  >`select id from auth.users where lower(email) = lower(${email})`
  if (row) return row.id
  console.warn(`A(z) ${email} felhasználó létrehozása nem sikerült: HTTP ${created.status}`)
  return null
}

try {
  const started = Date.now()
  await runSeed(sql, {
    adminEmail: process.env.SEED_ADMIN_EMAIL || null,
    createAuthUser,
    log: (m) => console.log(`· ${m}`),
  })
  console.log(`Seed kész (${((Date.now() - started) / 1000).toFixed(1)} mp).`)
} finally {
  await sql.end()
}
