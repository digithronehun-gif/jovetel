import { ImageResponse } from 'next/og'
import { SLOGAN, WORDMARK } from '@/components/brand/glyphs.generated'
import { palette } from '@/lib/brand/palette'

export const alt = 'JóVétel — Rávilágítunk a jó vételre.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const c = palette.light

/**
 * Közösségi előnézet: a szóvédjegy és a szlogen Bodoni Moda körvonalakból (glyphs.generated.ts),
 * így futásidőben nem kell font. Színek a paletta-tükörből, fénysugár --amber.
 */
export default function OpengraphImage() {
  const wmTop = 40
  const wmH = WORDMARK.capHeight + WORDMARK.descent + wmTop
  const wmWidthPx = 620
  const wmHeightPx = Math.round((wmWidthPx * wmH) / WORDMARK.width)
  const sloganH = SLOGAN.capHeight + SLOGAN.descent
  const sloganWidthPx = 820
  const sloganHeightPx = Math.round((sloganWidthPx * sloganH) / SLOGAN.width)
  const { ray } = WORDMARK

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 96px',
          backgroundColor: c.paper,
          backgroundImage: `radial-gradient(circle at 88% 12%, ${c.peach} 0%, ${c.paper} 55%)`,
        }}
      >
        <svg width={wmWidthPx} height={wmHeightPx} viewBox={`0 ${-wmTop} ${WORDMARK.width} ${wmH}`}>
          <path d={WORDMARK.path} fill={c.ink} />
          <line
            x1={ray.x1}
            y1={ray.y1}
            x2={ray.x2}
            y2={ray.y2}
            stroke={c.amber}
            strokeWidth={ray.width}
            strokeLinecap="round"
          />
        </svg>
        <div style={{ display: 'flex', marginTop: 44 }}>
          <svg width={sloganWidthPx} height={sloganHeightPx} viewBox={`0 0 ${SLOGAN.width} ${sloganH}`}>
            <path d={SLOGAN.path} fill={c['ink-muted']} />
          </svg>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 56,
            width: 160,
            height: 6,
            borderRadius: 3,
            backgroundColor: c.amber,
          }}
        />
      </div>
    ),
    size,
  )
}
