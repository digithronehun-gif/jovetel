import { Button, Text } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/EmailLayout'

export interface WaitlistConfirmProps {
  email: string
  confirmUrl: string
}

export const WAITLIST_CONFIRM_SUBJECT = 'Erősítsd meg a feliratkozásod a JóVételre'

/** Double opt-in megerősítő levél (PRODUCT_SPEC 3.11, 8. pont: tranzakciós). */
export default function WaitlistConfirm({ email, confirmUrl }: WaitlistConfirmProps) {
  return (
    <EmailLayout
      preview="Egy kattintás, és felkerülsz a várólistára."
      reason={
        <>
          Azért kapod, mert a(z) {email} címmel feliratkoztál a JóVétel várólistájára. Ha nem te voltál,
          hagyd figyelmen kívül: megerősítés nélkül nem írunk többet.
        </>
      }
    >
      <Text style={emailStyles.h1}>Már csak egy kattintás</Text>
      <Text style={emailStyles.p}>
        Köszönjük, hogy jelentkeztél! Erősítsd meg az e-mail-címedet, és szólunk, amint indulunk.
      </Text>
      <Button href={confirmUrl} style={emailStyles.button}>
        Megerősítem
      </Button>
      <Text style={{ ...emailStyles.muted, marginTop: 24 }}>
        Ha a gomb nem működik, másold be ezt a címet a böngésződbe: {confirmUrl}
      </Text>
    </EmailLayout>
  )
}

WaitlistConfirm.PreviewProps = {
  email: 'anna@pelda.hu',
  confirmUrl: 'http://localhost:3000/varolista/megerosites?t=minta-token',
} satisfies WaitlistConfirmProps
