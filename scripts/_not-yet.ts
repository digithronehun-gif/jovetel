/** Közös helykitöltő a még el nem készült parancsokhoz: világos üzenet, nem nulla kilépési kód. */
export function notYet(command: string, phase: string): never {
  console.error(
    `A(z) „${command}” parancs a ${phase} fázisban készül el (lásd START_PROMPT.md, docs/PROGRESS.md).`,
  )
  process.exit(2)
}
