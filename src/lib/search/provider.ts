import { PostgresSearch } from './postgres'
import type { SearchProvider } from './types'

let instance: SearchProvider | undefined

/** Az alkalmazás keresőszolgáltatása (egy megvalósítás: Postgres). A felület és az API ezt hívja. */
export function searchProvider(): SearchProvider {
  instance ??= new PostgresSearch()
  return instance
}
