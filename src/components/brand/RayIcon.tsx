import { cn } from '@/components/ui/cn'

type RaySize = 16 | 20 | 24

/**
 * Az AI jele (DESIGN_SYSTEM 5.3): félkör napkorong három kifelé mutató sugárral,
 * 1,5 px vonal, a korongon --amber kitöltés. NEM szikra, nem „sparkles”.
 */
export function RayIcon({
  size = 20,
  className,
  title,
}: {
  size?: RaySize
  className?: string
  title?: string
}) {
  const stroke = (1.5 * 24) / size
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn('shrink-0', className)}
      data-ray-icon
    >
      <path
        d="M4.5 19a7.5 7.5 0 0 1 15 0Z"
        fill="var(--amber)"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path
        d="M12 9.5V5.5M5.3 12.3 2.8 9.8M18.7 12.3l2.5-2.5"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <path d="M2.5 19h19" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  )
}
