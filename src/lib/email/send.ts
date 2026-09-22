/**
 * E-mail küldés egy helyen: Resend (élesben), helyben SMTP a Mailpitbe (SMTP_URL), végső esetben napló.
 * A sablon (React Email) a hívótól jön — a lib nem importál UI-t.
 */
import { render } from '@react-email/render'
import type { ReactElement } from 'react'

export interface EmailMessage {
  to: string
  subject: string
  react: ReactElement
  /** pl. List-Unsubscribe, List-Unsubscribe-Post */
  headers?: Record<string, string>
  tags?: { name: string; value: string }[]
}

export interface SendResult {
  id: string | null
  transport: 'resend' | 'smtp' | 'log'
}

function from(): string {
  return process.env.EMAIL_FROM || 'JóVétel <hello@jovetel.local>'
}

export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const html = await render(msg.react)
  const text = await render(msg.react, { plainText: true })

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { data, error } = await resend.emails.send({
      from: from(),
      to: msg.to,
      subject: msg.subject,
      html,
      text,
      headers: msg.headers,
      tags: msg.tags,
    })
    if (error) throw new Error(`Resend: ${error.message}`)
    return { id: data?.id ?? null, transport: 'resend' }
  }

  if (process.env.SMTP_URL) {
    const nodemailer = await import('nodemailer')
    const transport = nodemailer.createTransport(process.env.SMTP_URL)
    const info = await transport.sendMail({ from: from(), to: msg.to, subject: msg.subject, html, text, headers: msg.headers })
    return { id: info.messageId ?? null, transport: 'smtp' }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Nincs e-mail szolgáltató beállítva (RESEND_API_KEY).')
  }
  console.warn(`[e-mail, csak napló] ${msg.to} · ${msg.subject}`)
  return { id: null, transport: 'log' }
}
