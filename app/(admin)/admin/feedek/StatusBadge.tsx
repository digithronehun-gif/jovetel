import { Badge } from '@/components/ui/Tag'

const LABEL: Record<string, string> = {
  success: 'Sikeres',
  blocked: 'Blokkolva',
  failed: 'Hiba',
  running: 'Fut',
}
const TONE = { success: 'success', blocked: 'warning', failed: 'danger', running: 'neutral' } as const

/** A futás állapota szöveggel is (nem csak színnel). */
export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge>Még nem futott</Badge>
  return <Badge tone={TONE[status as keyof typeof TONE] ?? 'neutral'}>{LABEL[status] ?? status}</Badge>
}
