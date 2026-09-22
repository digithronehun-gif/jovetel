# DATA_MODEL — JóVétel V1

> Drizzle séma: `src/lib/db/schema/*.ts`. Minden tábla `id uuid pk default gen_random_uuid()`,
> `created_at timestamptz default now()`, `updated_at timestamptz` (triggerrel), hacsak nincs másképp jelölve.
> Pénz mindig **egész forint** (`integer`, `_huf` utótag). Időpont mindig `timestamptz`.
> Felhasználói táblákon RLS: `user_id = auth.uid()` (biztonsági háló; az alkalmazás szerveroldali
> Drizzle-lel ír/olvas, és **minden** lekérdező függvény `userId` paramétert kap).

---

## 1. Kiterjesztések és keresési konfiguráció

```sql
create extension if not exists unaccent;
create extension if not exists pg_trgm;
create text search configuration hu_unaccent (copy = hungarian);
alter text search configuration hu_unaccent
  alter mapping for asciiword, asciihword, hword_asciipart, word, hword, hword_part
  with unaccent, hungarian_stem;
```
Tesztelendő (F1 elfogadási kritérium): „parfümök” és „parfum” ugyanarra a lexémára fut;
„cipők” → „cipő” keresés talál; „szérum” ↔ „szerum” mindkét irányban talál.
Megjegyzés: az `unaccent` függvényt `immutable` wrapperbe kell tenni (`f_unaccent`), hogy
generált oszlopban és indexben használható legyen.

---

## 2. Katalógus

**`networks`** — `code` (awin, cj, dognet, admitad, tradetracker, direct, manual) unique · `name` ·
`subid_param` (pl. `clickref`, `sid`, `subid`) · `subid_max_len` · `notes`

**`merchants`** — `network_id` fk · `slug` unique · `name` · `domain_allowlist text[]` (a `/go` cél-host
ellenőrzéséhez) · `program_id` (a hálózat programazonosítója) · `status` (`pending`, `active`, `paused`,
`rejected`) · `shipping_fee_huf` · `free_shipping_threshold_huf` · `customs_fee_huf` (EU-n kívül, egyébként 0) ·
`delivery_days_min` · `delivery_days_max` · `return_days` · `quality_score numeric(3,2)` (0–1, kézi) ·
`is_comparison_allowed boolean` (a program engedi-e az összehasonlítást) · `terms_reviewed_at`

**`feeds`** — `merchant_id` fk · `format` (`csv`, `xml`, `json`, `api`) · `url` (titkos paraméter nélkül;
a kulcs környezeti változóban) · `adapter` · `schedule_cron` · `is_active` · `last_success_at` ·
`last_item_count`

**`feed_runs`** — `feed_id` fk · `started_at` · `finished_at` · `status` (`running`, `success`, `failed`,
`blocked`) · `items_seen` · `items_valid` · `items_changed` · `items_rejected` · `error_sample jsonb` ·
`raw_object_path` (Storage) · `blocked_reason`

**`brands`** — `slug` unique · `name`

**`categories`** — `slug` · `name` · `parent_id` fk (önhivatkozás) · `path text` (pl. `szepsegapolas/arcapolas/szerum`)
unique · `slot_id` (képhely, pl. `kategoria.arcapolas`) · `sort`

**`category_mappings`** — `merchant_id` · `source_category text` · `category_id` fk · unique(merchant_id, source_category)

**`products`** (kanonikus termék) — `slug` unique · `brand_id` fk · `category_id` fk · `name` · `name_normalized` ·
`gtin text` (index, nem unique: rossz feedadat) · `size_value numeric` · `size_unit` (`ml`, `g`, `db`) ·
`description_clean text` · `image_url` · `image_source_merchant_id` · `is_indexable boolean` ·
`search_vector tsvector` (generált: `setweight(to_tsvector('hu_unaccent', name),'A') || … brand 'A' … category 'B' … description 'C'`) ·
GIN index `search_vector`-on, GIN trigram index `name_normalized`-on

**`offers`** (termék × kereskedő) — `product_id` fk · `merchant_id` fk · `source_item_id` fk ·
`merchant_sku` · `url` (a bolt termékoldala) · `deeplink_template` · `price_huf` · `old_price_huf` (feed szerint;
**ítélethez nem használjuk**) · `in_stock boolean` · `last_seen_at` · `last_price_change_at` · `is_active` ·
unique(merchant_id, merchant_sku)

**`source_items`** — nyers, normalizált feed-tétel: `feed_id` · `merchant_sku` · `content_hash` · `payload jsonb`
(tisztított) · `first_seen_at` · `last_seen_at` · unique(feed_id, merchant_sku)

**`price_daily`** (ártörténet, havonta particionálva `day` szerint) — `offer_id` · `day date` · `price_min_huf` ·
`price_last_huf` · `in_stock_any boolean` · pk(offer_id, day). Az ingest minden futás után upsertel:
`price_min = least(meglévő, új)`, `price_last = új`.

**`product_tags`** — `product_id` · `tag` (pl. `skin_type:zsiros`, `free_from:illatanyag`, `concern:pigmentfolt`,
`occasion:karacsony`, `recipient:anya`, `interest:parfum`) · `source` (`rule`, `feed`, `editor`, `ai_extracted`) ·
`evidence text` (AI-kinyerésnél kötelező: szó szerinti idézet a leírásból) · `approved boolean` (AI-címke csak
jóváhagyva számít) · unique(product_id, tag)

**`usage_defaults`** — `category_id` · `unit` · `daily_amount numeric` · `note`

**`namedays`** — `month smallint` · `day smallint` · `name` · `name_normalized` · `is_primary boolean` ·
index(`name_normalized`)

---

## 3. Felhasználó

**`profiles`** (1:1 az `auth.users`-szel, `user_id` pk) — `display_name` · `first_name` · `use_case`
(`gifts`, `beauty`, `both`) · `skin_type` · `skin_concerns text[]` · `avoid_ingredients text[]` ·
`budget_band` (`u5`, `5_15`, `15_30`, `o30`) · `favorite_merchant_ids uuid[]` · `digest_time time default '07:30'` ·
`onboarding_completed_at` · `role` (`user`, `admin`) · `deleted_at`

**`consents`** — `user_id` (vagy `email` a várólistánál) · `type` (`service_email`, `marketing_email`,
`analytics`, `terms`, `privacy`) · `granted boolean` · `version` · `source` · `created_at`. **Csak hozzáfűzés**,
az aktuális állapot a legutolsó sor.

**`loved_ones`** — `user_id` · `nickname` · `relation` (`anya`, `apa`, `par`, `barat`, `baratno`, `testver`,
`gyerek`, `nagyszulo`, `kollega`, `egyeb`) · `first_name` · `nameday_month` · `nameday_day` · `birthday_month` ·
`birthday_day` · `birth_year` · `interests text[]` · `budget_band` · `note` · `avoid text[]`

**`occasions`** — `user_id` · `loved_one_id` (nullable: saját alkalom) · `type` (`birthday`, `nameday`,
`christmas`, `mothers_day`, `fathers_day`, `valentines`, `womens_day`, `mikulas`, `anniversary`, `custom`) ·
`label` · `month` · `day` (mozgó ünnepnél null, a `lib/occasions` számolja) · `remind_offsets smallint[] default '{10,3}'` ·
`is_active`

**`gift_history`** — `user_id` · `loved_one_id` · `occasion_type` · `year` · `product_id` (nullable) ·
`free_text` · `source` (`manual`, `click_confirm`)

**`lists`** — `owner_id` (user) · `type` (`wishlist`, `gift_ideas`, `editorial`, `creator`) · `title` · `slug` ·
`intro text` · `cover_slot` vagy `cover_image_url` · `loved_one_id` (nullable) · `occasion_type` · `occasion_date` ·
`visibility` (`private`, `link`, `public`) · `share_token` (32+ karakter, véletlen, unique, nullable) ·
`surprise_mode boolean default true` · `is_indexable boolean` (csak `editorial`) · `published_at`

**`list_items`** — `list_id` · `product_id` · `note` · `priority` (`must`, `nice`) · `price_at_add_huf` ·
`position` · unique(list_id, product_id)

**`reservations`** — `list_item_id` **unique** (egy tételt egy ember foglalhat) · `reserver_user_id` ·
`status` (`active`, `cancelled`, `purchased`) · `created_at`. Olvasás: a lista gazdája `surprise_mode` mellett
**semmit** nem lát ebből a táblából (ezt a lekérdező réteg és egy teszt is biztosítja).

**`price_alerts`** — `user_id` · `product_id` · `target_price_huf` · `is_active` · `last_triggered_at` ·
unique(user_id, product_id)

**`shelf_items`** — `user_id` · `product_id` · `size_value` · `size_unit` · `opened_at date` · `pace`
(`slow`, `normal`, `fast`) · `est_runout_date date` (számolt) · `status` (`active`, `finished`, `archived`)

**`notifications`** — `user_id` · `type` · `payload jsonb` · `dedupe_key` unique · `scheduled_for date` ·
`status` (`pending`, `sent`, `skipped`, `failed`) · `sent_at` · `email_id` (Resend) · `digest_id`

**`waitlist`** — `email` unique · `use_case` · `source` (UTM) · `confirmed_at` · `confirm_token_hash` ·
`marketing_consent boolean`

---

## 4. Követés és mérés

**`clicks`** — `click_id` (base62, 12 karakter) unique · `offer_id` · `merchant_id` · `user_id` (nullable) ·
`session_id` · `placement` (pl. `product_best`, `wizard_result`, `shared_list`, `email_digest`) · `content_ref`
(útmutató/lista id, kampánykód) · `ip_hash` · `ua_hash` · `is_bot boolean` · `created_at`
Index: `created_at`, `merchant_id`, `user_id`.

**`conversions`** — `network_id` · `network_transaction_id` unique(network_id, …) · `click_id` (a subID-ból) ·
`merchant_id` · `order_value_huf` · `commission_huf` · `status` (`pending`, `approved`, `rejected`) ·
`occurred_at` · `updated_from_network_at` · `raw jsonb`

**`events`** — szerveroldali alapesemények (consent nélkül is naplózható, személyes adat nélkül):
`name` · `user_id` nullable · `props jsonb` · `created_at`

**`ai_requests`** — `kind` (`interpret`, `explain`) · `user_id` nullable · `input_hash` · `model` ·
`tokens_in` · `tokens_out` · `cost_huf numeric(8,3)` · `cache_hit boolean` · `validator_passed boolean` ·
`latency_ms` · `created_at`. A felhasználó szövegét **nem** tároljuk nyersen, csak hash-t és a kinyert sémát.

**`ai_explanations`** (cache) — `cache_key` unique · `text` · `created_at` · `expires_at`

**`audit_log`** — `actor_user_id` · `action` · `entity` · `entity_id` · `diff jsonb` · `created_at`

---

## 5. Törlés és megőrzés
- Fióktörlés: `profiles.deleted_at` + azonnali kaszkád a felhasználói táblákon (loved_ones, occasions,
  gift_history, lists + items + reservations, price_alerts, shelf_items, notifications, consents
  kivéve a jogi igazoláshoz szükségeset), `clicks.user_id = null`. Supabase auth user törlése.
- `clicks`, `events`: 24 hónap, utána aggregálás és törlés. `ai_requests`: 12 hónap.
- `source_items.payload` és nyers feedfájlok: 30 nap.

## 6. Seed
Kategóriafa (szépségápolás és ajándék, képhelyekkel) · 3 hálózat · 3 minta kereskedő (fixture-feeddel) ·
300 mintatermék valósághű magyar nevekkel és árakkal, **`[DEMO]` jelöléssel a kereskedő nevében** ·
45 napnyi szintetikus ártörténet (hogy az ítélet látszódjon fejlesztésben) · `usage_defaults` ·
teljes `namedays` tábla · 1 admin felhasználó a `SEED_ADMIN_EMAIL`-ből · 3 szerkesztői útmutató váz.
