import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { SLOT_IDS } from '@/lib/assets/manifest'
import { requireAdmin } from '@/lib/auth/guards'
import { guideIndexability } from '@/lib/content/guides'
import { getGuideForAdmin, searchProductsForAdmin } from '@/lib/db/queries/admin/guides'
import { displayProductName } from '@/lib/format'
import { cleanQuery } from '@/lib/search/state'
import {
  addGuideItemAction,
  deleteGuideAction,
  moveGuideItemAction,
  publishGuideAction,
  removeGuideItemAction,
  updateGuideAction,
  updateGuideItemNoteAction,
} from '../actions'

export const metadata: Metadata = { title: 'Útmutató szerkesztése' }

const ERRORS: Record<string, string> = {
  foglalt: 'Ez az URL-név már foglalt.',
  ervenytelen: 'Hibás adat: a cím kötelező, az URL-név csak kisbetű, szám és kötőjel lehet.',
}

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string; hiba?: string; mentve?: string }> }

export default async function AdminGuideEditPage({ params, searchParams }: Props) {
  const admin = await requireAdmin()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const guide = await getGuideForAdmin(admin.userId, id)
  if (!guide) notFound()
  const sp = await searchParams
  const q = cleanQuery(sp.q ?? '')
  const found = q ? await searchProductsForAdmin(admin.userId, q) : []
  const inGuide = new Set(guide.items.map((i) => i.productId))
  const idx = guideIndexability({ intro: guide.intro, notes: guide.items.map((i) => i.note) })
  const hidden = (
    <>
      <input type="hidden" name="guideId" value={guide.id} />
      <input type="hidden" name="slug" value={guide.slug ?? ''} />
    </>
  )

  return (
    <div className="flex flex-col gap-8" data-guide-editor>
      <header className="flex flex-col gap-2">
        <Link href="/admin/utmutatok" className="text-small text-ink-muted hover:text-ink">
          ← Útmutatók
        </Link>
        <h1 className="text-display-m text-ink">{guide.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-small">
          <span className="font-semibold text-ink" data-guide-status>
            {guide.published ? 'Közzétéve' : 'Vázlat'}
          </span>
          {guide.published && guide.slug ? (
            <Link href={`/utmutatok/${guide.slug}`} className="text-amber-deep underline underline-offset-4">
              Megnyitás az oldalon
            </Link>
          ) : null}
          <form action={publishGuideAction}>
            {hidden}
            <input type="hidden" name="publish" value={guide.published ? '0' : '1'} />
            <Button type="submit" size="sm" variant={guide.published ? 'secondary' : 'primary'}>
              {guide.published ? 'Visszavonás' : 'Közzététel'}
            </Button>
          </form>
        </div>
        <p className="text-small text-ink-muted" data-guide-indexable>
          Indexelhető: <span className="font-semibold text-ink">{idx.indexable ? 'igen' : 'nem'}</span> · {idx.items} tétel · {idx.words} szó
          {idx.reasons.length ? ` — ${idx.reasons.join('; ')}` : ''}
        </p>
        {sp.hiba && ERRORS[sp.hiba] ? (
          <p role="alert" className="text-small text-pricier">
            {ERRORS[sp.hiba]}
          </p>
        ) : null}
        {sp.mentve ? (
          <p role="status" className="text-small text-deal">
            Mentve.
          </p>
        ) : null}
      </header>

      <form action={updateGuideAction} className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
        <input type="hidden" name="guideId" value={guide.id} />
        <label className="flex flex-col gap-1 text-small text-ink-muted">
          Cím
          <Input name="title" defaultValue={guide.title} required maxLength={120} />
        </label>
        <label className="flex flex-col gap-1 text-small text-ink-muted">
          URL-név (/utmutatok/…)
          <Input name="slug" defaultValue={guide.slug ?? ''} required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} />
        </label>
        <label className="flex flex-col gap-1 text-small text-ink-muted">
          Bevezető (szerkesztői szöveg; a bekezdéseket üres sor választja el)
          <Textarea name="intro" defaultValue={guide.intro ?? ''} rows={8} maxLength={8000} />
        </label>
        <label className="flex flex-col gap-1 text-small text-ink-muted">
          Borítókép (képhely)
          <select
            name="coverSlot"
            defaultValue={guide.coverSlot ?? 'utmutato.boritokep'}
            className="h-11 rounded-sm border border-line bg-surface px-3 text-body text-ink focus-visible:outline-2 focus-visible:outline-amber-deep"
          >
            {SLOT_IDS.filter((s) => /^(utmutato|alkalom|cimzett|kategoria)\./.test(s)).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <div>
          <Button type="submit">Mentés</Button>
        </div>
      </form>

      <section className="flex flex-col gap-3" aria-labelledby="tetelek">
        <h2 id="tetelek" className="text-title text-ink">
          Tételek ({guide.items.length})
        </h2>
        <ol className="flex flex-col gap-3" data-guide-items>
          {guide.items.map((item, i) => (
            <li key={item.id} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-body font-semibold text-ink">
                  {i + 1}. {item.brandName ? `${item.brandName} · ` : ''}
                  {displayProductName(item.productName, item.brandName)}
                </p>
                <div className="flex items-center gap-1">
                  {(['up', 'down'] as const).map((dir) => (
                    <form key={dir} action={moveGuideItemAction}>
                      {hidden}
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="direction" value={dir} />
                      <button
                        type="submit"
                        disabled={dir === 'up' ? i === 0 : i === guide.items.length - 1}
                        aria-label={dir === 'up' ? 'Feljebb' : 'Lejjebb'}
                        className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-stone disabled:opacity-40"
                      >
                        {dir === 'up' ? <ArrowUp aria-hidden className="size-4" /> : <ArrowDown aria-hidden className="size-4" />}
                      </button>
                    </form>
                  ))}
                  <form action={removeGuideItemAction}>
                    {hidden}
                    <input type="hidden" name="itemId" value={item.id} />
                    <button type="submit" aria-label="Eltávolítás" className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-stone hover:text-pricier">
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </form>
                </div>
              </div>
              <form action={updateGuideItemNoteAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                {hidden}
                <input type="hidden" name="itemId" value={item.id} />
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-small text-ink-muted">
                  Szerkesztői megjegyzés
                  <Textarea name="note" defaultValue={item.note ?? ''} rows={2} maxLength={500} />
                </label>
                <Button type="submit" variant="secondary" size="sm">
                  Megjegyzés mentése
                </Button>
              </form>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-line p-4">
          <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end" role="search">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-small text-ink-muted">
              Termék hozzáadása: keresés
              <Input name="q" type="search" defaultValue={q} placeholder="Pl. hialuronsavas szérum" />
            </label>
            <Button type="submit" variant="secondary">
              Keresés
            </Button>
          </form>
          {q ? (
            <ul className="flex flex-col" data-guide-product-results>
              {found.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
                  <span className="min-w-0 text-body text-ink">
                    {p.brandName ? <span className="text-ink-muted">{p.brandName} · </span> : null}
                    {displayProductName(p.name, p.brandName)}
                  </span>
                  {inGuide.has(p.id) ? (
                    <span className="shrink-0 text-small text-ink-muted">már benne van</span>
                  ) : (
                    <form action={addGuideItemAction}>
                      {hidden}
                      <input type="hidden" name="productId" value={p.id} />
                      <Button type="submit" size="sm">
                        Hozzáadás
                      </Button>
                    </form>
                  )}
                </li>
              ))}
              {found.length === 0 ? <li className="py-2 text-small text-ink-muted">Nincs találat.</li> : null}
            </ul>
          ) : null}
        </div>
      </section>

      <form action={deleteGuideAction} className="flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-end">
        <input type="hidden" name="guideId" value={guide.id} />
        <label className="flex flex-col gap-1 text-small text-ink-muted">
          Törléshez írd be: <strong className="text-ink">torles</strong>
          <Input name="confirm" autoComplete="off" className="sm:w-48" />
        </label>
        <Button type="submit" variant="secondary">
          Útmutató törlése
        </Button>
      </form>
    </div>
  )
}
