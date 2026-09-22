import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { palette } from '@/lib/brand/palette'
import { siteUrl } from '@/lib/env'
import { display, sans } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'JóVétel — Rávilágítunk a jó vételre.',
    template: '%s · JóVétel',
  },
  description:
    'Személyes vásárlási társ, ami emlékszik rád: valódi árak magyar boltokból, névnap- és születésnap-emlékeztető, árfigyelő és szépségpolc.',
  applicationName: 'JóVétel',
  formatDetection: { telephone: false, address: false, email: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: palette.light.paper },
    { media: '(prefers-color-scheme: dark)', color: palette.dark.paper },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="hu" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
