import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/EmptyState'
import { SlotImage } from '@/components/ui/SlotImage'
import { asSlotId } from '@/lib/assets'
import { paragraphs } from '@/lib/content/guides'
import { listPublishedGuides } from '@/lib/db/queries/catalog/guides'

export const metadata: Metadata = {
  title: 'Útmutatók',
  description: 'Szerkesztői ajándék- és vásárlási útmutatók: válogatások valódi árakkal, szállítással együtt.',
  alternates: { canonical: '/utmutatok' },
}

/** Szerkesztői útmutatók (PRODUCT_SPEC 9.): közzétett, nyilvános válogatások. */
export default async function GuidesPage() {
  const guides = await listPublishedGuides()
  return (
    <div className="mx-auto w-full max-w-app px-4 pt-6 pb-16 sm:px-6 md:px-8 md:pt-10">
      <header className="flex max-w-prose flex-col gap-3 pb-8">
        <p className="text-eyebrow text-ink-muted">Szerkesztőség</p>
        <h1 className="text-display-l text-ink">Útmutatók</h1>
        <p className="text-body-l text-ink-muted">
          Válogatások ajándékhoz és a saját polcodra. Az árakat mindig az adatbázisból mutatjuk, szállítással együtt.
        </p>
      </header>
      {guides.length === 0 ? (
        <EmptyState title="Hamarosan jönnek az első útmutatók.">Addig böngéssz a kategóriák között.</EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((g) => (
            <li key={g.id}>
              <Link
                href={`/utmutatok/${g.slug}`}
                className="group flex h-full flex-col gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep"
              >
                <SlotImage slot={asSlotId(g.coverSlot) ?? 'utmutato.boritokep'} sizes="(min-width: 1024px) 340px, (min-width: 640px) 45vw, 100vw" aspect="4/3" alt="" className="rounded-lg" />
                <h2 className="text-title text-ink group-hover:text-amber-deep">{g.title}</h2>
                {g.intro ? <p className="line-clamp-3 text-body text-ink-muted">{paragraphs(g.intro)[0]}</p> : null}
                <p className="text-small text-ink-muted">{g.itemCount} termék</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
