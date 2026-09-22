import { db } from '../db/client'
import { events } from '../db/schema'
import { CRITICAL_EVENTS, sanitizeProps, type EventName, type EventProps } from './events'

/** Szerveroldali alapesemény a saját `events` táblába (DATA_MODEL 4. pont). Hiba esetén nem dob. */
export async function logServerEvent(name: EventName, props: EventProps = {}, userId: string | null = null) {
  if (!CRITICAL_EVENTS.has(name)) return
  try {
    await db.insert(events).values({ name, props: sanitizeProps(props), userId })
  } catch (e) {
    console.error('events napló sikertelen', (e as Error).message)
  }
}
