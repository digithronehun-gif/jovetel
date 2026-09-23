/**
 * A bejelentkezett felhasználó a session sütiből. A `getUser()` a Supabase Auth szerverén ELLENŐRZI a tokent
 * (nem csak dekódolja), az `aal` (MFA-szint) ugyanebből a tokenből jön.
 */
import 'server-only'
import { supabaseServer } from './supabase-server'

export interface SessionUser {
  id: string
  email: string | null
  aal: 'aal1' | 'aal2'
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await supabaseServer()
  if (!supabase) return null
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  return { id: data.user.id, email: data.user.email ?? null, aal: aal?.currentLevel === 'aal2' ? 'aal2' : 'aal1' }
}
