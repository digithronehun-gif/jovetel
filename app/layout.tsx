import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { ConsentBanner } from '@/components/consent/ConsentBanner'
import { ConsentProvider } from '@/components/consent/ConsentProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { CONSENT_COOKIE, parseConsent } from '@/lib/analytics/consent'
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
  openGraph: {
    type: 'website',
    locale: 'hu_HU',
    siteName: 'JóVétel',
  },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: palette.light.paper },
    { media: '(prefers-color-scheme: dark)', color: palette.dark.paper },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies()
  const consent = parseConsent(jar.get(CONSENT_COOKIE)?.value)
  return (
    <html lang="hu" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>
        <a
          href="#tartalom"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Ugrás a tartalomra
        </a>
        <ConsentProvider initial={consent ? { analytics: consent.analytics, marketing: consent.marketing } : null}>
          <ToastProvider>{children}</ToastProvider>
          <ConsentBanner />
        </ConsentProvider>
      </body>
    </html>
  )
}
