import type { Metadata } from 'next'
import Link from 'next/link'
import { SlotImage } from '@/components/ui/SlotImage'
import { asSlotId } from '@/lib/assets'
import { categorySlot, childCategories, listCategories } from '@/lib/db/queries/catalog/categories'

export const metadata: Metadata = {
  title: 'Kategóriák',
  description: 'Szépségápolás és ajándék: böngéssz a kategóriák között, teljes árakkal és valódi akciókkal.',
  alternates: { canonical: '/kategoria' },
}

/** Kategória-áttekintő: a főkategóriák képhelyes kártyákon, alattuk az alkategóriák. */
export default async function CategoriesPage() {
  const all = await listCategories()
  const roots = childCategories(all, null)
  return (
    <div className="mx-auto w-full max-w-app px-4 pt-6 pb-16 sm:px-6 md:px-8 md:pt-10">
      <header className="flex flex-col gap-3 pb-8">
        <p className="text-eyebrow text-ink-muted">Böngészés</p>
        <h1 className="text-display-l text-ink">Kategóriák</h1>
      </header>
      <div className="flex flex-col gap-12">
        {roots.map((root) => (
          <section key={root.path} aria-labelledby={`kat-${root.slug}`} className="flex flex-col gap-5">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id={`kat-${root.slug}`} className="text-display-m text-ink">
                <Link href={`/kategoria/${root.path}`} className="hover:text-amber-deep">
                  {root.name}
                </Link>
              </h2>
              <Link href={`/kategoria/${root.path}`} className="shrink-0 text-small text-amber-deep underline underline-offset-4">
                Mind
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {childCategories(all, root.path).map((c) => {
                const slot = asSlotId(categorySlot(all, c.path)) ?? 'kategoria.szepsegapolas'
                return (
                  <li key={c.path}>
                    <Link href={`/kategoria/${c.path}`} className="group flex flex-col gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep">
                      <SlotImage slot={slot} sizes="(min-width: 768px) 240px, 45vw" aspect="4/3" alt="" className="rounded-lg" />
                      <span className="text-body font-semibold text-ink group-hover:text-amber-deep">{c.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
