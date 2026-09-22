/**
 * pnpm env:check — mely környezeti változók vannak beállítva. ÉRTÉKET SOHA NEM ÍR KI, csak igen/nem.
 * A .env.local / .env fájlt a Next.js-szel azonos sorrendben tölti be (a folyamat változói győznek).
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')

function parseEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!existsSync(file)) return out
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const value = m[2]!.replace(/\s+#.*$/, '').replace(/^["']|["']$/g, '')
    out[m[1]!] = value
  }
  return out
}

const example = parseEnvFile(join(ROOT, '.env.example'))
const merged = {
  ...parseEnvFile(join(ROOT, '.env')),
  ...parseEnvFile(join(ROOT, '.env.local')),
  ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined)),
} as Record<string, string>

const groups: Record<string, string[]> = {}
let group = 'Alap'
for (const line of readFileSync(join(ROOT, '.env.example'), 'utf8').split(/\r?\n/)) {
  const g = line.match(/^#\s+([A-ZÁÉÍÓÖŐÚÜŰ][^—(]*?)(?:\s*\(|$)/)
  if (
    g &&
    !line.includes('=') &&
    !line.startsWith('# JóVétel') &&
    !line.startsWith('# Másold') &&
    !line.startsWith('# hogy') &&
    !line.startsWith('# Ami')
  ) {
    group = g[1]!.trim()
  }
  const k = line.match(/^([A-Z0-9_]+)=/)
  if (k) (groups[group] ??= []).push(k[1]!)
}

let missing = 0
for (const [name, keys] of Object.entries(groups)) {
  console.log(`\n${name}`)
  for (const key of keys) {
    const set = Boolean(merged[key]?.trim())
    if (!set) missing++
    console.log(`  ${set ? 'igen' : ' nem'}  ${key}`)
  }
}
console.log(`\nÖsszesen: ${Object.keys(example).length} változó, ebből ${missing} nincs beállítva.`)
