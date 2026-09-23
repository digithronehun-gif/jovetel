/**
 * Feedszöveg tisztítása (2. vasszabály): minden HTML-t eltávolítunk (`sanitize-html`, üres engedélylistával;
 * a `script`/`style` TARTALMA is eltűnik), az entitásokat szöveggé bontjuk, a kétszeresen kódolt jelölést is
 * lecsupaszítjuk, kiszűrjük a vezérlő-, nulla szélességű és irányváltó karaktereket. Kimenet: egyszerű szöveg.
 */
import sanitizeHtml from 'sanitize-html'

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'iframe', 'object', 'svg', 'math', 'template', 'head', 'title'],
  parser: { decodeEntities: true },
}

// a sanitize-html kimenetében maradó alap-entitások visszabontása egyszerű szöveggé
const BASIC_ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'" }

// vezérlőkarakterek (a sortörés és a tab kivételével), nulla szélességű és irányváltó karakterek
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​-‏‪-‮⁠-⁤⁦-⁩﻿]/g

function stripOnce(input: string): string {
  const withBreaks = input
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6]|tr|section|article|ul|ol|table)\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
  const out = sanitizeHtml(withBreaks, SANITIZE)
  return out.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (m) => BASIC_ENTITIES[m] ?? m)
}

export function cleanText(raw: string | undefined | null, maxLength = 5000): string | null {
  if (raw == null) return null
  let s = String(raw)
  // legfeljebb háromszor: a kétszeresen kódolt „&lt;script&gt;” is lecsupaszodjon
  for (let i = 0; i < 3; i++) {
    const next = stripOnce(s)
    const again = /<\s*\/?\s*[a-z!][^>]*>/i.test(next)
    s = next
    if (!again) break
  }
  s = s
    .normalize('NFC')
    .replace(INVISIBLE, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t  ]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!s) return null
  if (s.length > maxLength) {
    const cut = s.slice(0, maxLength)
    const at = cut.lastIndexOf(' ')
    s = `${(at > maxLength * 0.8 ? cut.slice(0, at) : cut).trimEnd()}…`
  }
  return s
}

/** Egysoros mező (név, márka, kategória): a sortöréseket is szóközzé alakítja. */
export function cleanLine(raw: string | undefined | null, maxLength = 300): string | null {
  const s = cleanText(raw, maxLength)
  return s ? s.replace(/\s*\n\s*/g, ' ').trim() || null : null
}
