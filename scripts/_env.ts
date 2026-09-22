/**
 * A scriptek környezete: a folyamat változói győznek, utána .env.local, .env, végül a helyi stack
 * (.local/stack.env). Értéket soha nem írunk ki.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')

function load(file: string) {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m || process.env[m[1]!] !== undefined) continue
    process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, '')
  }
}

for (const f of ['.env.local', '.env', '.local/stack.env']) load(join(ROOT, f))

export function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    console.error(`Hiányzó környezeti változó: ${name} (pnpm env:check, vagy helyben: pnpm local:up)`)
    process.exit(1)
  }
  return v
}
