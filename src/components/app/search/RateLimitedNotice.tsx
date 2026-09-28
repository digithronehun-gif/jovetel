/** A keresés rate limitje után: adatbázis-lekérdezés nélkül, barátságos szöveggel. */
export function RateLimitedNotice() {
  return (
    <section className="mx-auto flex max-w-prose flex-col gap-3 px-4 py-16 text-center" data-rate-limited>
      <h1 className="text-display-m text-ink">Egy pillanat</h1>
      <p className="text-body text-ink-muted">Túl sok keresés érkezett rövid idő alatt erről a hálózatról. Próbáld újra egy perc múlva.</p>
    </section>
  )
}
