import type { ReactNode } from 'react'
import { cn } from './cn'

/**
 * Szekciófejléc: eyebrow + display cím + bevezető. A címben EGY dőlt kiemelés lehet
 * (<em>), ez a márka tipográfiai gesztusa: „Rávilágítunk <em>a jó vételre.</em>”
 */
export function SectionHeader({
  eyebrow,
  title,
  intro,
  as: Heading = 'h2',
  size = 'l',
  align = 'left',
  className,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  intro?: ReactNode
  as?: 'h1' | 'h2' | 'h3'
  size?: 'xl' | 'l' | 'm'
  align?: 'left' | 'center'
  className?: string
}) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow ? <p className="text-eyebrow text-amber-deep">{eyebrow}</p> : null}
      <Heading
        className={cn(
          'text-ink [&_em]:italic',
          size === 'xl' && 'text-display-xl',
          size === 'l' && 'text-display-l',
          size === 'm' && 'text-display-m',
        )}
      >
        {title}
      </Heading>
      {intro ? <div className="max-w-measure text-body-l text-ink-muted">{intro}</div> : null}
    </header>
  )
}
