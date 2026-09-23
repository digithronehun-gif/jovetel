/** Jogosultság-segédek a route handlerek, oldalak és Server Actionök elejére (4. vasszabály, első réteg). */
import 'server-only'
import { notFound, redirect } from 'next/navigation'
import { getProfile } from '../db/queries/user/profile'
import { adminAccess } from './access'
import { getSessionUser, type SessionUser } from './session'

export interface AdminContext {
  userId: string
  email: string | null
}

export async function requireAdmin(): Promise<AdminContext> {
  const user = await getSessionUser()
  const role = user ? ((await getProfile(user.id))?.role ?? null) : null
  const access = adminAccess(user, role)
  if (access === 'not_found') notFound()
  if (access === 'mfa_required') redirect('/admin/mfa')
  return { userId: user!.id, email: user!.email }
}

/** Admin, akinek még nincs aal2 szintje (az MFA-oldalnak kell). */
export async function requireAdminWithoutMfa(): Promise<SessionUser> {
  const user = await getSessionUser()
  const role = user ? ((await getProfile(user.id))?.role ?? null) : null
  if (!user || role !== 'admin') notFound()
  return user
}
