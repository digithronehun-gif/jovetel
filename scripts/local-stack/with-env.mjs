// Parancs futtatása a helyi stack környezeti változóival (.local/stack.env), ha azok még nincsenek
// beállítva. A .env.local-t a Next.js maga tölti be; ez a fájl a Docker nélküli stackhez kell.
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const file = join(import.meta.dirname, '../../.local/stack.env')
const env = { ...process.env }
if (existsSync(file)) {
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && env[m[1]] === undefined) env[m[1]] = m[2]
  }
} else {
  console.warn('Figyelem: nincs .local/stack.env — előbb: pnpm local:up')
}
const [cmd, ...args] = process.argv.slice(2)
const child = spawn(cmd, args, { stdio: 'inherit', env, shell: false })
child.on('exit', (code) => process.exit(code ?? 1))
