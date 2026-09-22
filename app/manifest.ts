import type { MetadataRoute } from 'next'
import { palette } from '@/lib/brand/palette'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JóVétel',
    short_name: 'JóVétel',
    description: 'Személyes vásárlási társ, ami emlékszik rád.',
    lang: 'hu',
    start_url: '/app',
    display: 'standalone',
    background_color: palette.light.paper,
    theme_color: palette.light.paper,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
