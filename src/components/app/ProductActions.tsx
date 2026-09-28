'use client'

import { Bell, Heart, Library } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { Price } from './PriceBlock'

export interface AlertTarget {
  pct: 5 | 10 | 20
  targetHuf: number
  href: string
}

/**
 * A termékoldal műveletei (PRODUCT_SPEC 5.3): Szólj, ha olcsóbb lesz (célár: −5% / −10% / −20% / egyéni) · Listára ·
 * Polcra teszem. Vendégnél belépésre visznek `returnTo` + `pendingAction` paraméterrel (waitlist módban a várólistára);
 * a végrehajtás belépve az F7–F8-ban készül el. A linkek szerveroldalon készülnek (`loginHref`).
 */
export function ProductActions({
  targets,
  customHrefTemplate,
  listHref,
  shelfHref,
  mode,
  showShelf,
}: {
  targets: AlertTarget[]
  /** a `__AMOUNT__` helyére kerül az egyéni célár */
  customHrefTemplate: string
  listHref: string
  shelfHref: string
  mode: 'login' | 'waitlist'
  /** a Szépségpolc csak szépségápolási terméknél értelmes */
  showShelf: boolean
}) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')
  const amount = Number.parseInt(custom.replace(/\D/g, ''), 10)
  const valid = Number.isFinite(amount) && amount > 0 && amount <= 10_000_000
  const note =
    mode === 'login'
      ? 'Belépés után elmentjük, és szólunk, ha az ár a célár alá megy.'
      : 'A figyeléshez ingyenes tagság kell. Most várólistával indulunk: iratkozz fel, és szólunk, amikor bekapcsolhatod.'
  return (
    <div className="flex flex-wrap gap-2" data-product-actions>
      <Button onClick={() => setOpen(true)} data-action="price-alert">
        <Bell aria-hidden />
        Szólj, ha olcsóbb lesz
      </Button>
      <Button asChild variant="secondary">
        <Link href={listHref} data-action="list">
          <Heart aria-hidden />
          Listára
        </Link>
      </Button>
      {showShelf ? (
        <Button asChild variant="secondary">
          <Link href={shelfHref} data-action="shelf">
            <Library aria-hidden />
            Polcra teszem
          </Link>
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Mikor szóljunk?" description={note}>
          <ul className="flex flex-col gap-2" aria-label="Célár">
            {targets.map((t) => (
              <li key={t.pct}>
                <Link
                  href={t.href}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 text-body text-ink hover:border-ink-subtle"
                  data-alert-target={t.pct}
                >
                  <span>−{t.pct}%</span>
                  <Price huf={t.targetHuf} />
                </Link>
              </li>
            ))}
          </ul>
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              if (valid) window.location.assign(customHrefTemplate.replace('__AMOUNT__', String(amount)))
            }}
          >
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-small text-ink-muted">
              Egyéni célár (Ft)
              <input
                inputMode="numeric"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="h-11 rounded-sm border border-line bg-surface px-3 text-body text-ink focus-visible:border-amber-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep"
              />
            </label>
            <Button type="submit" variant="secondary" disabled={!valid}>
              Ennyinél szólj
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
