import type { NextConfig } from 'next'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'
import { assertLicensedForProduction } from './src/lib/assets'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

export default function config(phase: string): NextConfig {
  // 7. vasszabály: production buildben fejlesztési (moodboard) kép csak ALLOW_DEV_IMAGES=true mellett.
  if (phase === PHASE_PRODUCTION_BUILD) {
    assertLicensedForProduction({ ...process.env, NODE_ENV: 'production' })
  }
  return {
    poweredByHeader: false,
    // a `next dev` ne írja át a tulajdonos CLAUDE.md-jét (a Next 16 dokumentáció: node_modules/next/dist/docs)
    agentRules: false,
    reactStrictMode: true,
    typedRoutes: false,
    env: {
      // a kliensoldali képhely-feloldáshoz (build-időben rögzítve)
      ALLOW_DEV_IMAGES: process.env.ALLOW_DEV_IMAGES ?? '',
    },
    images: {
      formats: ['image/avif', 'image/webp'],
      deviceSizes: [390, 640, 750, 900, 1080, 1200, 1440],
      imageSizes: [32, 48, 64, 96, 128, 160, 256, 384],
    },
    async headers() {
      return [{ source: '/:path*', headers: securityHeaders }]
    },
  }
}
