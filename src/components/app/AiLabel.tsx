import { RayIcon } from '@/components/brand/RayIcon'
import { cn } from '@/components/ui/cn'

export const AI_LABEL_TEXT =
  'Mesterséges intelligenciával beszélsz. Az árakat és a készletet mindig az adatbázisból mutatjuk.'

/** Minden AI-felületen kötelező (CLAUDE.md 10. pont). */
export function AiLabel({ className }: { className?: string }) {
  return (
    <p
      data-ai-label
      className={cn('flex items-start gap-2 text-small font-normal text-ink-muted', className)}
    >
      <RayIcon size={16} className="mt-0.5 text-ink-muted" />
      <span>{AI_LABEL_TEXT}</span>
    </p>
  )
}
