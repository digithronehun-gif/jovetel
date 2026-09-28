-- 0010: az F6 utáni független átnézés javításai (6. vasszabály)
-- 1. A „Valódi akció?” ítélet KIZÁRÓLAG a saját napi ártörténetünkből: a feed „régi ár” mezője nem változtathatja a
--    „Most drágább”-at „Szokásos ár”-rá (eddig igen); csak a tényszerű kiegészítő mondatot (feed_discount_note) váltja ki.
--    A TS-pár: lib/pricing/verdict.ts.
-- 2. A statisztika pillanatképének ideje (`catalog_stats_state.refreshed_at`): a keresés, a kategória, az útmutató és a
--    „Hasonló termékek” kártyáin az „ár ellenőrizve” idő legfeljebb ez lehet — így a feed újabb sikeres futása nem
--    tüntethet fel frissnek egy még a régi pillanatképből származó árat, és ha a statisztika-frissítés tartósan elakad,
--    a kártyák 48 óra után eltűnnek.
set search_path = "$user", public, extensions;

create table public.catalog_stats_state (
  id boolean primary key default true check (id),
  refreshed_at timestamptz not null
);
-- szerveroldali, nem nyilvános (mint a product_stats)
alter table public.catalog_stats_state enable row level security;

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

  -- a statisztika pillanatképének ideje: a kártyák „ár ellenőrizve” ideje ennél nem lehet későbbi
  insert into public.catalog_stats_state (id, refreshed_at) values (true, p_now)
  on conflict (id) do update set refreshed_at = excluded.refreshed_at;

  return query select ow, od, pw;
end $$;

-- a már meglévő sorok az új szabály szerint (és a pillanatkép ideje is beíródik)
select * from public.refresh_catalog_stats(now());
