import Image from 'next/image'
import { getSlotImage, type SlotId } from '@/lib/assets'
import { cn } from './cn'

/**
 * Márkakép képhelyről (7. vasszabály). A komponens soha nem kap fájlnevet, csak képhely-azonosítót.
 * Mindig `next/image`: elmosott előnézet, domináns szín a konténer hátterén, pontos `sizes`.
 * A 736 px széles képek legfeljebb ~560 CSS px szélesen jelenjenek meg.
 */
export function SlotImage({
  slot,
  sizes,
  priority = false,
  orientation,
  className,
  imageClassName,
  aspect,
  alt,
}: {
  slot: SlotId
  sizes: string
  priority?: boolean
  orientation?: 'portrait' | 'landscape'
  className?: string
  imageClassName?: string
  /** pl. '4/5'; ha nincs megadva, a kép saját aránya */
  aspect?: string
  /** felülírja a manifest alt-szövegét (pl. dekoratív képnél üres string) */
  alt?: string
}) {
  const img = getSlotImage(slot, { orientation })
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        backgroundColor: img.dominantColor,
        aspectRatio: aspect ?? `${img.width}/${img.height}`,
      }}
      data-slot-id={slot}
      data-image-license={img.license}
    >
      <Image
        src={img.src}
        alt={alt ?? img.alt}
        fill
        sizes={sizes}
        priority={priority}
        placeholder="blur"
        blurDataURL={img.blurDataURL}
        className={cn('object-cover', imageClassName)}
      />
    </div>
  )
}
