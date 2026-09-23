import type { Sql } from 'postgres'

export interface StatsRefresh {
  offersWritten: number
  offersDeleted: number
  productsWritten: number
  durationMs: number
}

/**
 * 10. lépés: a származtatott ár-statisztika (offer_stats, product_stats: teljes ár, legjobb friss ajánlat,
 * „Valódi akció?” ítélet) frissítése. Az ingest végén fut; csak az eltérő sorokat írja (0009 migráció).
 */
export async function refreshCatalogStats(sql: Sql, now: Date = new Date()): Promise<StatsRefresh> {
  const t0 = Date.now()
  const [r] = await sql<{ offers_written: number; offers_deleted: number; products_written: number }[]>`
    select * from public.refresh_catalog_stats(${now.toISOString()}::timestamptz)`
  return {
    offersWritten: r!.offers_written,
    offersDeleted: r!.offers_deleted,
    productsWritten: r!.products_written,
    durationMs: Date.now() - t0,
  }
}
