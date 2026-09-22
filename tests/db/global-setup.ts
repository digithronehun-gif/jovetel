import { createTestDatabase } from './prepare'

/** A `db` teszt-projekt közös adatbázisa (a migrációs teszt külön adatbázist használ). */
export default async function setup() {
  const url = await createTestDatabase('jovetel_test')
  process.env.DATABASE_URL = url
  process.env.TEST_DATABASE_URL = url
}
