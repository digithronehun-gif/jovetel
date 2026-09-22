// Kis helyi átjáró a Supabase „Kong” szerepében: /auth/v1/* → GoTrue. Csak fejlesztéshez.
import { existsSync, readFileSync } from 'node:fs'
import http from 'node:http'
import { basename, join } from 'node:path'

const PORT = Number(process.env.GATEWAY_PORT ?? 54321)
const AUTH = new URL(process.env.GOTRUE_URL ?? 'http://127.0.0.1:9999')
const TEMPLATES = process.env.TEMPLATES_DIR ?? ''

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`)
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end('{"ok":true}')
  }
  // A GoTrue innen tölti le a magyar levélsablonokat (GOTRUE_MAILER_TEMPLATES_*)
  if (url.pathname.startsWith('/templates/') && TEMPLATES) {
    const file = join(TEMPLATES, basename(url.pathname))
    if (existsSync(file)) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      return res.end(readFileSync(file))
    }
  }
  if (!url.pathname.startsWith('/auth/v1')) {
    res.writeHead(404, { 'content-type': 'application/json' })
    return res.end(
      JSON.stringify({ message: 'A helyi átjáró csak az /auth/v1 útvonalat szolgálja ki.' }),
    )
  }
  const target = new URL(url.pathname.replace(/^\/auth\/v1/, '') || '/', AUTH)
  target.search = url.search
  const headers = { ...req.headers, host: AUTH.host }
  const proxied = http.request(target, { method: req.method, headers }, (up) => {
    // A GoTrue a CORS-t maga kezeli; a Location fejlécet visszaírjuk az átjáró címére
    const out = { ...up.headers }
    if (out.location && out.location.startsWith(AUTH.origin)) {
      out.location = out.location.replace(AUTH.origin, `http://127.0.0.1:${PORT}/auth/v1`)
    }
    res.writeHead(up.statusCode ?? 502, out)
    up.pipe(res)
  })
  proxied.on('error', (e) => {
    res.writeHead(502, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ message: `GoTrue nem érhető el: ${e.message}` }))
  })
  req.pipe(proxied)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`átjáró: http://127.0.0.1:${PORT}/auth/v1 → ${AUTH.origin}`)
})
