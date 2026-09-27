-- 0009 · Keresés és kategóriaoldalak (F4): származtatott ár-statisztika + teljes egyezéshalmaz lazítással.
--
-- A szűrők (teljes ár, készleten, valódi akció) és a facetek 50 000 terméken is gyorsak kell legyenek (p95 < 300 ms),
-- ezért a legjobb ajánlat, a teljes ár és a „Valódi akció?” ítélet előre számolt, SZÁRMAZTATOTT táblákban van:
--   offer_stats   — ajánlatonként: teljes ár (PRODUCT_SPEC 7.4), 30 napos ablak (n, min30, 2·med30), ítélet (7.3)
--   product_stats — termékenként: a legjobb friss ajánlat, címkék, kategóriaútvonal
-- A `refresh_catalog_stats()` minden ingest végén fut, és CSAK eltérésnél ír. A TS-pár (lib/pricing: totalCost,
-- verdictFromStats) ugyanazokkal az egész számos küszöbökkel számol; a tests/db/stats.test.ts ezt ellenőrzi.
-- A jutalék mértéke egyik táblában sem szerepel (3. vasszabály).
set search_path = "$user", public, extensions;

-- ── Szövegkeresés ────────────────────────────────────────────────────────────────────────────────────────────────
-- Márka + név ékezetmentesen: az elírás-toleráns trigram-visszaeséshez (a márkanév is lehet elírva)
alter table public.products
  add column search_text text generated always as (public.f_normalize(coalesce(brand_name, '') || ' ' || name)) stored;
create index products_search_text_trgm_idx on public.products using gin (search_text extensions.gin_trgm_ops);
create index products_created_idx on public.products (created_at desc);

-- A keresőkérdés szavanként (szótő VAGY ékezetmentes előtag); a search_tsquery ezek ÉS-kapcsolata.
create or replace function public.search_tsquery_words(q text) returns tsquery[]
language plpgsql immutable parallel safe as $$
declare
  w text;
  stem tsquery;
  result tsquery[] := '{}';
begin
  for w in select distinct t from regexp_split_to_table(public.f_normalize(coalesce(q, '')), '[^a-z0-9]+') as t
           where length(t) > 0
  loop
    stem := to_tsquery('public.hu_unaccent'::regconfig, w);
    if numnode(stem) = 0 then
      continue; -- töltelékszó
    end if;
    if length(w) >= 3 then
      result := result || (stem || to_tsquery('public.simple_unaccent'::regconfig, w || ':*'));
    else
      result := result || stem;
    end if;
  end loop;
  return result;
end $$;

create or replace function public.search_tsquery(q text) returns tsquery
language plpgsql immutable parallel safe as $$
declare
  x tsquery;
  result tsquery;
begin
  foreach x in array public.search_tsquery_words(q) loop
    result := case when result is null then x else result && x end;
  end loop;
  return result; -- üres (csak töltelékszó) kérdésre NULL: semmi nem egyezik
end $$;

-- Ugyanez VAGY-kapcsolattal (a lazított kereséshez)
create or replace function public.search_tsquery_any(q text) returns tsquery
language plpgsql immutable parallel safe as $$
declare
  x tsquery;
  result tsquery;
begin
  foreach x in array public.search_tsquery_words(q) loop
    result := case when result is null then x else result || x end;
  end loop;
  return result;
end $$;

-- Teljes egyezéshalmaz relevanciával (PRODUCT_SPEC 7.2 „relevancia”, 0–1):
--   1. ÉS-kapcsolat (minden szó egyezik): 0,4 + 0,6 · (0,7 · ts_rank_cd/(1+ts_rank_cd) + 0,3 · word_similarity)
--   2. ha ez `relax_below`-nál kevesebb találat (elírás, túl szűk kérdés): lazítás — bármelyik szó egyezik VAGY
--      a márka + név trigram-hasonló; 0,4 · (0,6 · lefedettség + 0,4 · word_similarity). A lazított találat így
--      mindig a teljes egyezés mögé kerül.
create or replace function public.search_match(q text, relax_below integer default 5)
returns table (product_id uuid, relevance real, matched_by text)
language plpgsql stable parallel safe as $$
declare
  words tsquery[] := public.search_tsquery_words(q);
  tsq tsquery := public.search_tsquery(q);
  tsq_any tsquery := case when cardinality(words) > 1 then public.search_tsquery_any(q) end;
  norm text := btrim(regexp_replace(public.f_normalize(coalesce(q, '')), '[^a-z0-9]+', ' ', 'g'));
  n integer := 0;
begin
  if tsq is not null then
    return query
      select p.id,
        (0.4 + 0.6 * (0.7 * (ts_rank_cd(p.search_vector, tsq) / (1 + ts_rank_cd(p.search_vector, tsq)))
          + 0.3 * word_similarity(norm, p.search_text)))::real,
        'fts'::text
      from public.products p
      where p.search_vector @@ tsq;
    get diagnostics n = row_count;
  end if;
  if n < relax_below and length(norm) >= 3 then
    return query
      select p.id,
        (0.4 * (0.6 * (case when cardinality(words) = 0 then 0
                  else (select count(*) from unnest(words) w where p.search_vector @@ w)::real / cardinality(words) end)
                + 0.4 * word_similarity(norm, p.search_text)))::real,
        'relaxed'::text
      from public.products p
      where ((tsq_any is not null and p.search_vector @@ tsq_any) or norm <% p.search_text)
        and (tsq is null or not (p.search_vector @@ tsq));
  end if;
end $$;

-- ── Teljes költség (PRODUCT_SPEC 7.4; a TS-pár: lib/pricing/totalCost.ts) ────────────────────────────────────────
create or replace function public.offer_shipping_huf(price integer, fee integer, threshold integer)
returns integer language sql immutable parallel safe as $$
  select case when threshold is not null and price >= threshold then 0 else greatest(fee, 0) end
$$;

-- ── Származtatott táblák ─────────────────────────────────────────────────────────────────────────────────────────
create table public.offer_stats (
  offer_id uuid primary key references public.offers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  -- a frissesség a lekérdezéskor számol: missed_runs = 0 esetén a feed last_success_at-je (DATA_MODEL 8. pont)
  feed_id uuid references public.feeds (id) on delete set null,
  seen_at timestamptz not null,
  missed_runs smallint not null,
  price_huf integer not null,
  shipping_huf integer not null,
  customs_huf integer not null,
  total_huf integer not null,
  in_stock boolean not null,
  days_tracked smallint not null,
  min30_huf integer,
  med30_twice integer,
  verdict text not null check (verdict in ('deal', 'usual', 'pricier', 'collecting')),
  feed_discount_note boolean not null,
  real_discount_pct smallint,
  updated_at timestamptz not null default now()
);
create index offer_stats_product_idx on public.offer_stats (product_id);
create index offer_stats_merchant_idx on public.offer_stats (merchant_id, product_id);

create table public.product_stats (
  product_id uuid primary key references public.products (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  category_path text,
  brand_id uuid references public.brands (id) on delete set null,
  -- a frissítéskor friss (≤ 48 órás), listázható ajánlatok
  offer_count smallint not null default 0,
  merchant_ids uuid[] not null default '{}',
  best_offer_id uuid references public.offers (id) on delete set null,
  best_merchant_id uuid references public.merchants (id) on delete set null,
  best_feed_id uuid references public.feeds (id) on delete set null,
  best_seen_at timestamptz,
  best_missed_runs smallint,
  best_price_huf integer,
  best_shipping_huf integer,
  best_customs_huf integer,
  best_total_huf integer,
  best_in_stock boolean not null default false,
  best_quality numeric(3, 2),
  verdict text check (verdict in ('deal', 'usual', 'pricier', 'collecting')),
  real_discount_pct smallint,
  days_tracked smallint,
  -- jóváhagyott címkék (szűrők, facetek, „Miért neked”)
  tags text[] not null default '{}',
  -- a „Legújabb” rendezéshez (a products tábla széles sorait így a keresésnek nem kell olvasnia)
  product_created_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index product_stats_category_idx on public.product_stats (category_path text_pattern_ops);
create index product_stats_tags_idx on public.product_stats using gin (tags);
create index product_stats_best_total_idx on public.product_stats (best_total_huf) where best_offer_id is not null;
create index product_stats_brand_idx on public.product_stats (brand_id);

-- Szerveroldali, nem nyilvános (mint az offers): RLS policy nélkül a publikus kulccsal nem olvasható
alter table public.offer_stats enable row level security;
alter table public.product_stats enable row level security;

-- ── Frissítés ────────────────────────────────────────────────────────────────────────────────────────────────────
-- Listázható ajánlat: aktív, a kereskedő aktív ÉS a program engedi az összehasonlítást (merchants.is_comparison_allowed).
-- A 30 napos ablak: a [ma − 30, ma − 1] budapesti napok (a mai nap nem számít, PRODUCT_SPEC 7.3).
-- Csak az eltérő sorokat írja; a visszatérési érték a megírt / törölt sorok száma.
create or replace function public.refresh_catalog_stats(p_now timestamptz default now())
returns table (offers_written integer, offers_deleted integer, products_written integer)
language plpgsql as $$
declare
  today date := (p_now at time zone 'Europe/Budapest')::date;
  ow integer;
  od integer;
  pw integer;
begin
  with listable as (
    select o.id, o.product_id, o.merchant_id, si.feed_id, o.last_seen_at, o.missed_runs, o.price_huf, o.old_price_huf,
      o.in_stock, public.offer_shipping_huf(o.price_huf, m.shipping_fee_huf, m.free_shipping_threshold_huf) as shipping,
      greatest(m.customs_fee_huf, 0) as customs
    from public.offers o
    join public.merchants m on m.id = o.merchant_id and m.status = 'active' and m.is_comparison_allowed
    left join public.source_items si on si.id = o.source_item_id
    where o.is_active
  ), hist as (
    select pd.offer_id, count(*)::integer as n, min(pd.price_min_huf) as min30,
      (2 * percentile_cont(0.5) within group (order by pd.price_last_huf))::bigint as med2
    from public.price_daily pd
    where pd.day >= today - 30 and pd.day < today and pd.offer_id in (select id from listable)
    group by pd.offer_id
  ), computed as (
    select l.*, coalesce(h.n, 0) as n, h.min30, h.med2,
      case
        when coalesce(h.n, 0) < 14 or h.min30 is null then 'collecting'
        when 100::bigint * l.price_huf < 97::bigint * h.min30 then 'deal'
        when l.old_price_huf is not null and l.old_price_huf > l.price_huf and l.price_huf >= h.min30 then 'usual'
        when 200::bigint * l.price_huf > 105::bigint * h.med2 then 'pricier'
        else 'usual'
      end as verdict,
      (coalesce(h.n, 0) >= 14 and h.min30 is not null and not (100::bigint * l.price_huf < 97::bigint * h.min30)
        and l.old_price_huf is not null and l.old_price_huf > l.price_huf and l.price_huf >= h.min30) as note
    from listable l left join hist h on h.offer_id = l.id
  ), upserted as (
    insert into public.offer_stats as s (offer_id, product_id, merchant_id, feed_id, seen_at, missed_runs, price_huf,
      shipping_huf, customs_huf, total_huf, in_stock, days_tracked, min30_huf, med30_twice, verdict, feed_discount_note,
      real_discount_pct)
    select c.id, c.product_id, c.merchant_id, c.feed_id, c.last_seen_at, c.missed_runs, c.price_huf, c.shipping, c.customs,
      c.price_huf + c.shipping + c.customs, c.in_stock, c.n, c.min30, c.med2, c.verdict, c.note,
      case when c.verdict = 'deal' then ((c.med2 - 2::bigint * c.price_huf) * 100 / c.med2)::smallint end
    from computed c
    on conflict (offer_id) do update set
      product_id = excluded.product_id, merchant_id = excluded.merchant_id, feed_id = excluded.feed_id,
      seen_at = excluded.seen_at, missed_runs = excluded.missed_runs, price_huf = excluded.price_huf,
      shipping_huf = excluded.shipping_huf, customs_huf = excluded.customs_huf, total_huf = excluded.total_huf,
      in_stock = excluded.in_stock, days_tracked = excluded.days_tracked, min30_huf = excluded.min30_huf,
      med30_twice = excluded.med30_twice, verdict = excluded.verdict, feed_discount_note = excluded.feed_discount_note,
      real_discount_pct = excluded.real_discount_pct, updated_at = now()
    where (s.product_id, s.merchant_id, s.feed_id, s.seen_at, s.missed_runs, s.price_huf, s.shipping_huf, s.customs_huf,
        s.total_huf, s.in_stock, s.days_tracked, s.min30_huf, s.med30_twice, s.verdict, s.feed_discount_note,
        s.real_discount_pct)
      is distinct from (excluded.product_id, excluded.merchant_id, excluded.feed_id, excluded.seen_at,
        excluded.missed_runs, excluded.price_huf, excluded.shipping_huf, excluded.customs_huf, excluded.total_huf,
        excluded.in_stock, excluded.days_tracked, excluded.min30_huf, excluded.med30_twice, excluded.verdict,
        excluded.feed_discount_note, excluded.real_discount_pct)
    returning 1
  )
  select count(*) into ow from upserted;

  delete from public.offer_stats s
  where not exists (
    select 1 from public.offers o join public.merchants m on m.id = o.merchant_id
    where o.id = s.offer_id and o.is_active and m.status = 'active' and m.is_comparison_allowed);
  get diagnostics od = row_count;

  with fresh as (
    select s.*, m.quality_score
    from public.offer_stats s
    join public.merchants m on m.id = s.merchant_id
    left join public.feeds f on f.id = s.feed_id
    where (case when s.missed_runs = 0 and f.last_success_at is not null then greatest(f.last_success_at, s.seen_at)
                else s.seen_at end) >= p_now - interval '48 hours'
  ), best as (
    select distinct on (product_id) *
    from fresh
    order by product_id, in_stock desc, total_huf, quality_score desc, offer_id
  ), agg as (
    select product_id, count(*)::smallint as offer_count, array_agg(distinct merchant_id order by merchant_id) as merchant_ids
    from fresh group by product_id
  ), tags as (
    select product_id, array_agg(tag order by tag) as tags from public.product_tags where approved group by product_id
  ), upserted as (
    insert into public.product_stats as ps (product_id, category_id, category_path, brand_id, offer_count, merchant_ids,
      best_offer_id, best_merchant_id, best_feed_id, best_seen_at, best_missed_runs, best_price_huf, best_shipping_huf,
      best_customs_huf, best_total_huf, best_in_stock, best_quality, verdict, real_discount_pct, days_tracked, tags,
      product_created_at)
    select p.id, p.category_id, c.path, p.brand_id, coalesce(a.offer_count, 0), coalesce(a.merchant_ids, '{}'),
      b.offer_id, b.merchant_id, b.feed_id, b.seen_at, b.missed_runs, b.price_huf, b.shipping_huf, b.customs_huf,
      b.total_huf, coalesce(b.in_stock, false), b.quality_score, b.verdict, b.real_discount_pct, b.days_tracked,
      coalesce(t.tags, '{}'), p.created_at
    from public.products p
    left join public.categories c on c.id = p.category_id
    left join best b on b.product_id = p.id
    left join agg a on a.product_id = p.id
    left join tags t on t.product_id = p.id
    on conflict (product_id) do update set
      category_id = excluded.category_id, category_path = excluded.category_path, brand_id = excluded.brand_id,
      offer_count = excluded.offer_count, merchant_ids = excluded.merchant_ids, best_offer_id = excluded.best_offer_id,
      best_merchant_id = excluded.best_merchant_id, best_feed_id = excluded.best_feed_id,
      best_seen_at = excluded.best_seen_at, best_missed_runs = excluded.best_missed_runs,
      best_price_huf = excluded.best_price_huf, best_shipping_huf = excluded.best_shipping_huf,
      best_customs_huf = excluded.best_customs_huf, best_total_huf = excluded.best_total_huf,
      best_in_stock = excluded.best_in_stock, best_quality = excluded.best_quality, verdict = excluded.verdict,
      real_discount_pct = excluded.real_discount_pct, days_tracked = excluded.days_tracked, tags = excluded.tags,
      product_created_at = excluded.product_created_at, updated_at = now()
    where (ps.category_id, ps.category_path, ps.brand_id, ps.offer_count, ps.merchant_ids, ps.best_offer_id,
        ps.best_merchant_id, ps.best_feed_id, ps.best_seen_at, ps.best_missed_runs, ps.best_price_huf,
        ps.best_shipping_huf, ps.best_customs_huf, ps.best_total_huf, ps.best_in_stock, ps.best_quality, ps.verdict,
        ps.real_discount_pct, ps.days_tracked, ps.tags, ps.product_created_at)
      is distinct from (excluded.category_id, excluded.category_path, excluded.brand_id, excluded.offer_count,
        excluded.merchant_ids, excluded.best_offer_id, excluded.best_merchant_id, excluded.best_feed_id,
        excluded.best_seen_at, excluded.best_missed_runs, excluded.best_price_huf, excluded.best_shipping_huf,
        excluded.best_customs_huf, excluded.best_total_huf, excluded.best_in_stock, excluded.best_quality,
        excluded.verdict, excluded.real_discount_pct, excluded.days_tracked, excluded.tags, excluded.product_created_at)
    returning 1
  )
  select count(*) into pw from upserted;

  return query select ow, od, pw;
end $$;
