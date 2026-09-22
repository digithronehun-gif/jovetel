import { customType } from 'drizzle-orm/pg-core'

/** Postgres tsvector (generált oszlop; csak olvasásra). */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})
