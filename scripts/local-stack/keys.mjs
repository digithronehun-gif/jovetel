// A Supabase CLI helyi fejlesztésre használt, nyilvános demó JWT-titkával aláírt anon és service kulcs.
// Csak helyi stackhez; élesben a Supabase projekt saját kulcsai kellenek.
import { createHmac } from 'node:crypto'

export const LOCAL_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long'

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')

export function sign(payload, secret = LOCAL_JWT_SECRET) {
  const head = b64({ alg: 'HS256', typ: 'JWT' })
  const body = b64(payload)
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')
  return `${head}.${body}.${sig}`
}

export const anonKey = sign({ iss: 'supabase-demo', role: 'anon', exp: 1983812996 })
export const serviceKey = sign({ iss: 'supabase-demo', role: 'service_role', exp: 1983812996 })

if (process.argv[1] && process.argv[1].endsWith('keys.mjs')) {
  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`)
  console.log(`SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`)
}
