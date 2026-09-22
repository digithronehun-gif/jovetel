import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'
import type { CostBreakdown, VerdictKind } from '@/lib/pricing'
import { PriceBlock } from './PriceBlock'
import { ProductImage } from './ProductImage'
import { VerdictBadge } from './VerdictBadge'
import { WhyTag } from './WhyTag'

export interface ProductCardData {
  slug: string
  name: string
  brandName: string | null
  imageUrl: string | null
  cost: CostBreakdown | null
  merchantName?: string
  checkedAt?: Date | string
  verdict?: VerdictKind | null
  whyTags?: string[]
}

/**
 * Termékkártya (DESIGN_SYSTEM 6. pont): kép 4:5 --stone háttéren, márka, név (max. 2 sor), PriceBlock,
 * VerdictBadge (ha van), max. 3 WhyTag, és egy műveleti hely (pl. szív → listára).
 */
export function ProductCard({
  product,
  variant = 'grid',
  href,
  action,
  now,
  className,
  imageSizes,
}: {
  product: ProductCardData
  variant?: 'grid' | 'row' | 'compact'
  href?: string
  action?: ReactNode
  now?: Date
  className?: string
  imageSizes?: string
}) {
  const link = href ?? `/termek/${product.slug}`
  const tags = (product.whyTags ?? []).slice(0, 3)
  const verdict = product.verdict && product.verdict !== 'collecting' ? product.verdict : null
  const row = variant === 'row'
  const compact = variant === 'compact'

  return (
    <article
      data-product-card={variant}
      className={cn(
        'group relative flex rounded-lg border border-line bg-surface transition-[border-color] duration-150 ease-sun hover:border-ink-subtle',
        row ? 'flex-row gap-4 p-3' : 'flex-col gap-3 p-3',
        className,
      )}
    >
      <ProductImage
        src={product.imageUrl}
        alt={product.name}
        sizes={imageSizes ?? (row ? '96px' : compact ? '160px' : '(min-width: 900px) 240px, 45vw')}
        className={cn(row && 'w-24 shrink-0')}
      />
      <div className={cn('flex min-w-0 flex-1 flex-col', compact ? 'gap-1' : 'gap-2')}>
        {product.brandName ? <p className="truncate text-xs font-semibold text-ink-muted">{product.brandName}</p> : null}
        <h3 className={cn('line-clamp-2 text-ink', compact ? 'text-small' : 'text-body font-semibold')}>
          <Link href={link} className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        {product.cost ? (
          <PriceBlock
            cost={product.cost}
            merchantName={compact ? undefined : product.merchantName}
            checkedAt={compact ? undefined : product.checkedAt}
            now={now}
            size={compact ? 's' : 'm'}
            showBreakdown={!compact}
          />
        ) : (
          <p className="text-small font-normal text-ink-muted">Most nincs elérhető ajánlat.</p>
        )}
        {verdict || tags.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {verdict ? <VerdictBadge kind={verdict} size="sm" /> : null}
            {tags.map((t) => (
              <WhyTag key={t}>{t}</WhyTag>
            ))}
          </div>
        ) : null}
      </div>
      {action ? <div className="absolute top-2 right-2 z-10">{action}</div> : null}
    </article>
  )
}
