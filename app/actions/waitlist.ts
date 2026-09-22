'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import WaitlistConfirm, { WAITLIST_CONFIRM_SUBJECT } from '@/emails/WaitlistConfirm'
import { logServerEvent } from '@/lib/analytics/server'
import { pickUtm } from '@/lib/analytics/utm'
import { subscribeWaitlist } from '@/lib/db/queries/waitlist'
import { sendEmail } from '@/lib/email/send'
import { siteUrl } from '@/lib/env'
import { clientIp, hashIdentifier } from '@/lib/security/ip'
import { rateLimit, RULES } from '@/lib/security/ratelimit'
import { verifyTurnstile } from '@/lib/security/turnstile'

const Schema = z.object({
  email: z.string().trim().toLowerCase().email('Ez nem tűnik érvényes e-mail-címnek.').max(254),
  useCase: z.enum(['gifts', 'beauty', 'both'], { message: 'Válaszd ki, mire használnád.' }),
  marketing: z.boolean(),
  turnstileToken: z.string().max(4096).optional().nullable(),
  // mézesbödön-mező: embernek láthatatlan, bot kitölti
  website: z.string().max(0).optional().default(''),
})

export type WaitlistState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string; fieldErrors?: Partial<Record<'email' | 'useCase', string>> }

export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const parsed = Schema.safeParse({
    email: formData.get('email'),
    useCase: formData.get('useCase'),
    marketing: formData.get('marketing') === 'on',
    turnstileToken: formData.get('cf-turnstile-response'),
    website: formData.get('website') ?? '',
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return {
      status: 'error',
      message: 'Nézd át a mezőket.',
      fieldErrors: { email: fe.email?.[0], useCase: fe.useCase?.[0] },
    }
  }
  const h = await headers()
  const ip = clientIp(h)
  const limit = await rateLimit(RULES.waitlist, hashIdentifier(ip))
  if (!limit.ok) return { status: 'error', message: 'Túl sok próbálkozás. Próbáld újra egy óra múlva.' }

  const turnstile = await verifyTurnstile(parsed.data.turnstileToken, ip)
  if (!turnstile.ok) return { status: 'error', message: 'A bot-ellenőrzés nem sikerült. Frissítsd az oldalt, és próbáld újra.' }

  // UTM-forrás a rejtett mezőkből (süti nélkül): csak ismert kulcsok, rövidítve
  const source = pickUtm((k) => formData.get(k))

  const res = await subscribeWaitlist({
    email: parsed.data.email,
    useCase: parsed.data.useCase,
    marketingConsent: parsed.data.marketing,
    source,
  })
  if (res.status === 'pending') {
    const confirmUrl = `${siteUrl()}/varolista/megerosites?t=${encodeURIComponent(res.token)}`
    try {
      await sendEmail({
        to: res.email,
        subject: WAITLIST_CONFIRM_SUBJECT,
        react: WaitlistConfirm({ email: res.email, confirmUrl }),
        tags: [{ name: 'type', value: 'waitlist_confirm' }],
      })
    } catch (e) {
      console.error('várólista-levél küldése sikertelen', (e as Error).message)
      return { status: 'error', message: 'Most nem sikerült elküldeni a levelet. Próbáld újra pár perc múlva.' }
    }
  }
  // Ugyanaz a válasz, akár új, akár már megerősített a cím (nem áruljuk el, ki van a listán)
  await logServerEvent('waitlist_submit', { use_case: parsed.data.useCase, utm_source: source.utm_source ?? null })
  return { status: 'success' }
}
