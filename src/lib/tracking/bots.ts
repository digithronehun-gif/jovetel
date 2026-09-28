/**
 * Botszűrés a kattintásnaplóhoz (ARCHITECTURE 4. pont, 4. lépés). A bot is a boltba jut (nem blokkolunk), de a
 * kattintása `is_bot = true` jelölést kap, így nem torzítja a kattintásszámot és az EPC-t.
 */
const BOT_UA =
  /bot\b|bot[/;-]|crawl|spider|slurp|mediapartners|facebookexternalhit|facebookcatalog|embedly|quora link preview|whatsapp|telegrambot|discordbot|skypeuripreview|bingpreview|linkedinbot|pinterest|vkshare|w3c_validator|curl\/|wget\/|python-requests|python-urllib|aiohttp|httpx|go-http-client|java\/|okhttp|axios\/|node-fetch|undici|libwww|scrapy|headlesschrome|phantomjs|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|monitor|preview/i

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua || ua.trim().length < 10) return true
  return BOT_UA.test(ua)
}

/** Böngészős előtöltés (Speculation Rules, `<link rel=prefetch>`): nem valódi kattintás. */
export function isPrefetch(headers: Headers): boolean {
  const purpose = `${headers.get('sec-purpose') ?? ''} ${headers.get('purpose') ?? ''} ${headers.get('x-purpose') ?? ''}`
  return /prefetch|prerender|preview/i.test(purpose) || headers.get('x-moz') === 'prefetch'
}

export function isBotRequest(headers: Headers): boolean {
  return isBotUserAgent(headers.get('user-agent')) || isPrefetch(headers)
}
