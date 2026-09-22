import { Body, Container, Head, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { ReactNode } from 'react'
import { palette } from '../../src/lib/brand/palette'

const c = palette.light

export const emailStyles = {
  body: { margin: 0, backgroundColor: c.paper, fontFamily: 'Manrope, Helvetica, Arial, sans-serif', color: c.ink },
  card: { backgroundColor: c.surface, border: `1px solid ${c.line}`, borderRadius: 24, padding: '32px 28px' },
  h1: { fontSize: 22, lineHeight: '1.3', margin: '0 0 12px', fontWeight: 700, color: c.ink },
  p: { fontSize: 16, lineHeight: '1.55', margin: '0 0 16px', color: c.ink },
  muted: { fontSize: 13, lineHeight: '1.45', margin: 0, color: c['ink-muted'] },
  button: {
    display: 'inline-block',
    backgroundColor: c.ink,
    color: c.paper,
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: 16,
    padding: '14px 28px',
    borderRadius: 999,
  },
  accentButton: {
    display: 'inline-block',
    backgroundColor: c['amber-deep'],
    color: c['on-accent'],
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: 15,
    padding: '12px 22px',
    borderRadius: 999,
  },
  link: { color: c['amber-deep'] },
  hr: { borderColor: c.line, margin: '24px 0' },
} as const

/** Közös levélkeret: szóvédjegy (szövegként, képblokkolásnál is olvasható), kártya, lábléc az okkal. */
export function EmailLayout({
  preview,
  children,
  reason,
  footer,
}: {
  preview: string
  children: ReactNode
  /** „Azért kapod, mert …” (PRODUCT_SPEC 8. pont) */
  reason: ReactNode
  footer?: ReactNode
}) {
  return (
    <Html lang="hu">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={emailStyles.body}>
        <Container style={{ maxWidth: 560, padding: '32px 16px' }}>
          <Text style={{ fontFamily: "Georgia, 'Bodoni Moda', serif", fontSize: 28, margin: '0 0 16px', color: c.ink }}>
            J<span style={{ color: c['amber-deep'] }}>ó</span>Vétel
          </Text>
          <Section style={emailStyles.card}>{children}</Section>
          <Section style={{ padding: '16px 8px 0' }}>
            <Text style={emailStyles.muted}>{reason}</Text>
            {footer ? (
              <>
                <Hr style={emailStyles.hr} />
                {footer}
              </>
            ) : null}
            <Text style={{ ...emailStyles.muted, marginTop: 12 }}>JóVétel · Rávilágítunk a jó vételre.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
