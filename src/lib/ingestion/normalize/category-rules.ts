/**
 * Kulcsszavas kategória-szabályok: ha a kereskedő kategóriájára nincs kézi leképezés (`category_mappings`),
 * a forráskategória és a terméknév ékezetmentes szövegéből ezek döntenek. Sorrend: a szűkebb szabály előbb.
 * A cél-útvonalak a seed kategóriafájához (CATEGORY_TREE) tartoznak.
 */
export interface CategoryRule {
  path: string
  /** ékezetmentes, kisbetűs szövegre illesztve */
  test: RegExp
}

export const CATEGORY_RULES: CategoryRule[] = [
  { path: 'szepsegapolas/szemkornyek', test: /szemkornyek|szemkrem|eye cream|szemranckrem/ },
  { path: 'szepsegapolas/napvedelem/fenyvedo-arcra', test: /(fenyvedo|naptej|napvedo|spf).{0,40}\barc|\barc.{0,40}(fenyvedo|spf|napvedo)/ },
  { path: 'szepsegapolas/napvedelem/fenyvedo-testre', test: /fenyvedo|naptej|napozo|napvedo|spf ?\d/ },
  { path: 'szepsegapolas/arcapolas/szerum', test: /\bszerum|\bserum\b|ampulla/ },
  { path: 'szepsegapolas/arcapolas/arcmaszk', test: /arcmaszk|fatyolmaszk|sheet mask|agyagmaszk|\bmaszk\b/ },
  { path: 'szepsegapolas/arcapolas/arctisztito', test: /arctisztit|micellas|tisztito ?(gel|hab|tej)|cleanser|sminklemoso/ },
  { path: 'szepsegapolas/arcapolas/arckrem', test: /arckrem|nappali krem|ejszakai krem|face cream|arcapolo krem|hidratalo krem/ },
  { path: 'szepsegapolas/testapolas/tusfurdo', test: /tusfurdo|shower gel|tusolozsel|tusolo/ },
  { path: 'szepsegapolas/testapolas/testapolo', test: /testapolo|body lotion|testvaj|testkrem|testolaj/ },
  { path: 'szepsegapolas/hajapolas/sampon', test: /sampon|shampoo/ },
  { path: 'szepsegapolas/hajapolas/hajbalzsam', test: /hajbalzsam|kondicionalo|conditioner|hajpakolas/ },
  { path: 'szepsegapolas/smink/szempillaspiral', test: /szempillaspiral|mascara/ },
  { path: 'szepsegapolas/smink/ruzs', test: /\bruzs|ajakruzs|lipstick|szajfeny|ajakfeny/ },
  { path: 'szepsegapolas/smink/alapozo', test: /alapozo|foundation|\bbb krem|\bcc krem/ },
  { path: 'szepsegapolas/parfum/ferfi-parfum', test: /(ferfi|\bmen\b|homme|for him).{0,60}(parfum|edt|edp|eau de|kolni)|(parfum|edt|edp|eau de|kolni).{0,60}(ferfi|\bmen\b|homme|for him)/ },
  { path: 'szepsegapolas/parfum/noi-parfum', test: /(noi|women|femme|pour elle|for her).{0,60}(parfum|edt|edp|eau de)|(parfum|edt|edp|eau de).{0,60}(noi|women|femme|pour elle|for her)/ },
  { path: 'szepsegapolas/parfum', test: /parfum|eau de (parfum|toilette)|\bedp\b|\bedt\b|illatminta/ },
  { path: 'ajandek/ajandekcsomag', test: /ajandekcsomag|ajandekszett|ajandekdoboz|gift set|\bszett\b|dobozos/ },
  { path: 'ajandek/otthon/illatgyertya', test: /illatgyertya|gyertya|candle/ },
  { path: 'ajandek/otthon/illatosito', test: /illatosito|diffuzor|parafazo|legfrissito|aromalampa/ },
  { path: 'ajandek/divat/kendo', test: /kendo|\bsal\b|selyemkendo|scarf|stola/ },
  { path: 'ajandek/divat/taska', test: /taska|neszesszer|kozmetikai tasak|\bbag\b/ },
  { path: 'ajandek/ekszer', test: /ekszer|nyaklanc|fulbevalo|karkoto|\bgyuru|medal/ },
]

/** Az első illeszkedő szabály útvonala, vagy null. */
export function ruleCategoryPath(normalizedText: string): string | null {
  return CATEGORY_RULES.find((r) => r.test.test(normalizedText))?.path ?? null
}
