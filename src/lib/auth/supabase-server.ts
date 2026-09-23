/**
 * Szerveroldali Supabase-kliens a session sütikkel (`@supabase/ssr`). Csak szerveren fut; a kulcs a publikus
 * anon kulcs (a jogosultságot a JWT és az RLS dönti el, a service role kulcs ide SOHA nem kerül).
 */
import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function supabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && anonKey ? { url, anonKey } : null
}

export async function supabaseServer() {
  const cfg = supabaseConfig()
  if (!cfg) return null
  const store = await cookies()
  return createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options)
        } catch {
          // Server Componentből nem írható süti; a frissítést a következő Server Action / Route Handler végzi
        }
      },
    },
  })
}
