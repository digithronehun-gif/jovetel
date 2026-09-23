import { Text } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

export interface FeedAlertProps {
  merchant: string
  status: 'blocked' | 'failed'
  reason: string
  seen: number
  valid: number
  rejected: number
  adminUrl: string
}

export const feedAlertSubject = (p: Pick<FeedAlertProps, 'merchant' | 'status'>) =>
  `[JóVétel] Feed ${p.status === 'blocked' ? 'blokkolva' : 'hiba'}: ${p.merchant}`

/** Riasztás az adminnak (ARCHITECTURE 9. pont): a feed blokkolt vagy hibás futása. Belső, tranzakciós levél. */
export default function FeedAlert(p: FeedAlertProps) {
  return (
    <EmailLayout
      preview={`${p.merchant}: ${p.status === 'blocked' ? 'a futás blokkolva, nem publikáltunk' : 'a futás hibával leállt'}`}
      reason="Azért kapod, mert te vagy a JóVétel üzemeltetője (ADMIN_ALERT_EMAIL)."
    >
      <Text style={emailStyles.h1}>{p.status === 'blocked' ? 'Feed blokkolva' : 'Feed-hiba'}: {p.merchant}</Text>
      <Text style={emailStyles.p}>{p.reason}</Text>
      <Text style={emailStyles.p}>
        Látott tételek: {p.seen} · érvényes: {p.valid} · elutasított: {p.rejected}.{' '}
        {p.status === 'blocked' ? 'A katalógusban és az ártörténetben semmi nem változott.' : ''}
      </Text>
      <Text style={emailStyles.muted}>Részletek és hibaminta: {p.adminUrl}</Text>
    </EmailLayout>
  )
}

FeedAlert.PreviewProps = {
  merchant: '[DEMO] Napfény Drogéria',
  status: 'blocked',
  reason: 'A tételszám (410) az előző sikeres futás (1000) 41%-a, a határ 60%.',
  seen: 430,
  valid: 410,
  rejected: 20,
  adminUrl: 'http://localhost:3000/admin/feedek',
} satisfies FeedAlertProps
