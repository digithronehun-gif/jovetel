'use client'

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

/** „Mikor szóljunk?” — célár −5% / −10% / −20% vagy egyéni összeg (PRODUCT_SPEC 5.3). Igény szerint töltődik. */
export function PriceAlertDialog({
  open,
  onOpenChange,
  targets,
  customHrefTemplate,
  note,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  targets: AlertTarget[]
  /** a `__AMOUNT__` helyére kerül az egyéni célár */
  customHrefTemplate: string
  note: string
}) {
  const [custom, setCustom] = useState('')
  const amount = Number.parseInt(custom.replace(/\D/g, ''), 10)
  const valid = Number.isFinite(amount) && amount > 0 && amount <= 10_000_000
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
  )
}
