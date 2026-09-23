/**
 * Hozzáférési döntések tiszta függvényként (egységtesztelhető). A 4. vasszabály szerint a route / Server Action
 * ezt a döntést hozza, az adatréteg pedig a szerepkört a lekérdezésben újra ellenőrzi.
 */
export type AdminAccess = 'ok' | 'not_found' | 'mfa_required'

/** Nem admin → 404 (az admin felület létezését sem áruljuk el); admin MFA nélkül → MFA-lépés. */
export function adminAccess(user: { aal: 'aal1' | 'aal2' } | null, role: string | null): AdminAccess {
  if (!user || role !== 'admin') return 'not_found'
  if (user.aal !== 'aal2') return 'mfa_required'
  return 'ok'
}
