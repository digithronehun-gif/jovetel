// Helyi HTTP/2 + TLS + brotli proxy a `next start` elé, hogy a Lighthouse ugyanazt a protokollt mérje,
// amit élesben a Vercel ad (HTTP/2, brotli). Csak méréshez; önaláírt tanúsítvánnyal (.local/perf/).
//   node scripts/perf/h2-proxy.mjs [--port 3443] [--target http://localhost:3100]
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import http from 'node:http'
import http2 from 'node:http2'
import { join } from 'node:path'
import zlib from 'node:zlib'

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : def
}
const PORT = Number(arg('port', '3443'))
const TARGET = new URL(arg('target', 'http://localhost:3100'))

const dir = join(import.meta.dirname, '../../.local/perf')
mkdirSync(dir, { recursive: true })
const key = join(dir, 'key.pem')
const cert = join(dir, 'cert.pem')
if (!existsSync(key)) {
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '30', '-subj', '/CN=localhost'], { stdio: 'ignore' })
}

const HOP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-connection', 'content-length', 'content-encoding'])
const COMPRESSIBLE = /^(text\/|application\/(javascript|json|manifest\+json|xml)|image\/svg\+xml)/

const server = http2.createSecureServer({ key: readFileSync(key), cert: readFileSync(cert), allowHTTP1: true })
server.on('request', (req, res) => {
  const headers = { ...req.headers, host: TARGET.host, 'accept-encoding': 'identity', 'x-forwarded-proto': 'https' }
  for (const h of Object.keys(headers)) if (h.startsWith(':')) delete headers[h]
  const up = http.request({ host: TARGET.hostname, port: TARGET.port, method: req.method, path: req.url, headers }, (ur) => {
    const out = {}
    for (const [k, v] of Object.entries(ur.headers)) if (!HOP.has(k) && v !== undefined) out[k] = v
    const type = String(ur.headers['content-type'] ?? '')
    const brotli = COMPRESSIBLE.test(type) && /\bbr\b/.test(String(req.headers['accept-encoding'] ?? ''))
    if (brotli) out['content-encoding'] = 'br'
    else if (ur.headers['content-length']) out['content-length'] = ur.headers['content-length']
    res.writeHead(ur.statusCode ?? 502, out)
    if (!brotli) return ur.pipe(res)
    // streamelt HTML: minden darab után ürítjük a tömörítőt, hogy a streaming megmaradjon
    const br = zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } })
    br.pipe(res)
    ur.on('data', (c) => {
      br.write(c)
      br.flush()
    })
    ur.on('end', () => br.end())
  })
  up.on('error', () => {
    res.writeHead(502)
    res.end()
  })
  req.pipe(up)
})
server.listen(PORT, () => console.log(`h2-proxy: https://localhost:${PORT} → ${TARGET.origin}`))
