'use server'

import { redirect } from 'next/navigation'
import { logServerEvent } from '@/lib/analytics/server'
import { confirmWaitlist } from '@/lib/db/queries/waitlist'

/** A megerősítés gombnyomásra (POST) történik, így a levelek linkjeit előtöltő szkennerek nem erősítenek meg. */
export async function confirmWaitlistAction(formData: FormData) {
  const token = String(formData.get('t') ?? '')
  const res = await confirmWaitlist(token)
  if (res.ok) {
    if (!res.alreadyConfirmed) await logServerEvent('waitlist_confirm')
    redirect('/varolista/megerosites?kesz=1')
  }
  redirect(`/varolista/megerosites?hiba=${res.reason}`)
}
