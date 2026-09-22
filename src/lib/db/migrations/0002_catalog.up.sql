-- 0002 · Katalógus (DATA_MODEL 2. pont). Pénz: egész forint (integer, _huf). Időpont: timestamptz.
set search_path = "$user", public, extensions;

create table public.networks (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    check (code in ('awin', 'cj', 'dognet', 'admitad', 'tradetracker', 'direct', 'manual')),
  name text not null,
  subid_param text,
  subid_max_len integer check (subid_max_len is null or subid_max_len > 0),
  -- a /go cél-host ellenőrzéséhez: a hálózat saját tracking-domainjei (ARCHITECTURE 4. pont)
  tracking_domains text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.networks (id),
  slug text not null unique,
  name text not null,
  domain_allowlist text[] not null default '{}',
  program_id text,
  status text not null default 'pending' check (status in ('pending', 'active', 'paused', 'rejected')),
  shipping_fee_huf integer not null default 0 check (shipping_fee_huf >= 0),
  free_shipping_threshold_huf integer check (free_shipping_threshold_huf is null or free_shipping_threshold_huf >= 0),
  customs_fee_huf integer not null default 0 check (customs_fee_huf >= 0),
  delivery_days_min smallint check (delivery_days_min is null or delivery_days_min >= 0),
  delivery_days_max smallint check (delivery_days_max is null or delivery_days_max >= 0),
  return_days smallint check (return_days is null or return_days >= 0),
  quality_score numeric(3, 2) not null default 0.50 check (quality_score between 0 and 1),
  is_comparison_allowed boolean not null default false,
  terms_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (delivery_days_min is null or delivery_days_max is null or delivery_days_min <= delivery_days_max)
);
create index merchants_network_idx on public.merchants (network_id);

create table public.feeds (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  format text not null check (format in ('csv', 'xml', 'json', 'api')),
  url text,
  adapter text not null,
  -- adapter-beállítások (oszlop-leképezés, kódolás…); titok soha nem kerül ide
  config jsonb not null default '{}',
  schedule_cron text,
  is_active boolean not null default true,
  last_success_at timestamptz,
  last_item_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index feeds_merchant_idx on public.feeds (merchant_id);

create table public.feed_runs (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references public.feeds (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'failed', 'blocked')),
  items_seen integer not null default 0,
  items_valid integer not null default 0,
  items_changed integer not null default 0,
  items_rejected integer not null default 0,
  error_sample jsonb not null default '[]',
  raw_object_path text,
  blocked_reason text,
  stats jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index feed_runs_feed_started_idx on public.feed_runs (feed_id, started_at desc);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  parent_id uuid references public.categories (id) on delete restrict,
  path text not null unique,
  slot_id text,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index categories_parent_idx on public.categories (parent_id);

create table public.category_mappings (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  source_category text not null,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, source_category)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  brand_id uuid references public.brands (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  -- denormalizált keresési mezők (a generált search_vector más táblára nem hivatkozhat)
  brand_name text,
  category_text text,
  name_normalized text generated always as (public.f_normalize(name)) stored,
  gtin text,
  size_value numeric(10, 2) check (size_value is null or size_value > 0),
  size_unit text check (size_unit in ('ml', 'g', 'db')),
  description_clean text,
  image_url text,
  image_source_merchant_id uuid references public.merchants (id) on delete set null,
  is_indexable boolean not null default false,
  search_vector tsvector generated always as (
    setweight(to_tsvector('public.hu_unaccent'::regconfig, coalesce(name, '')), 'A') ||
    setweight(to_tsvector('public.hu_unaccent'::regconfig, coalesce(brand_name, '')), 'A') ||
    setweight(to_tsvector('public.hu_unaccent'::regconfig, coalesce(category_text, '')), 'B') ||
    setweight(to_tsvector('public.hu_unaccent'::regconfig, coalesce(left(description_clean, 4000), '')), 'C') ||
    setweight(to_tsvector('public.simple_unaccent'::regconfig,
      coalesce(name, '') || ' ' || coalesce(brand_name, '')), 'A') ||
    setweight(to_tsvector('public.simple_unaccent'::regconfig, coalesce(category_text, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_search_idx on public.products using gin (search_vector);
create index products_name_trgm_idx on public.products using gin (name_normalized extensions.gin_trgm_ops);
create index products_gtin_idx on public.products (gtin) where gtin is not null;
create index products_category_idx on public.products (category_id);
create index products_brand_idx on public.products (brand_id);

create table public.source_items (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references public.feeds (id) on delete cascade,
  merchant_sku text not null,
  content_hash text not null,
  payload jsonb not null default '{}',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (feed_id, merchant_sku)
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  source_item_id uuid references public.source_items (id) on delete set null,
  merchant_sku text not null,
  url text not null,
  deeplink_template text,
  price_huf integer not null check (price_huf > 0),
  -- a feed szerinti „régi ár”: a Valódi akció ítélethez SOHA nem használjuk (6. vasszabály)
  old_price_huf integer check (old_price_huf is null or old_price_huf > 0),
  in_stock boolean not null default true,
  last_seen_at timestamptz not null default now(),
  last_price_change_at timestamptz,
  is_active boolean not null default true,
  -- egymás utáni futások száma, amelyekben a feed nem tartalmazta (2 után inaktív, ARCHITECTURE 3.7)
  missed_runs smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, merchant_sku)
);
create index offers_product_active_idx on public.offers (product_id) where is_active;
create index offers_merchant_idx on public.offers (merchant_id);

-- Napi ártörténet, havonta particionálva (DATA_MODEL 2. pont)
create table public.price_daily (
  offer_id uuid not null references public.offers (id) on delete cascade,
  day date not null,
  price_min_huf integer not null check (price_min_huf > 0),
  price_last_huf integer not null check (price_last_huf > 0),
  in_stock_any boolean not null default false,
  primary key (offer_id, day)
) partition by range (day);

create table public.price_daily_default partition of public.price_daily default;

-- Havi partíciók előre létrehozása: select public.ensure_price_daily_partitions(date, hónapok)
create or replace function public.ensure_price_daily_partitions(from_day date, months integer)
returns integer language plpgsql as $$
declare
  start date := date_trunc('month', from_day)::date;
  i integer;
  created integer := 0;
  p_start date;
  p_end date;
  p_name text;
begin
  for i in 0 .. months - 1 loop
    p_start := (start + make_interval(months => i))::date;
    p_end := (p_start + interval '1 month')::date;
    p_name := format('price_daily_%s', to_char(p_start, 'YYYY_MM'));
    if not exists (select 1 from pg_class where relname = p_name and relnamespace = 'public'::regnamespace) then
      -- az alapértelmezett partícióba tévedt sorokat előbb átköltöztetjük
      execute format('create table public.%I (like public.price_daily including defaults including constraints)', p_name);
      execute format(
        'with moved as (delete from public.price_daily_default where day >= %L and day < %L returning *)
         insert into public.%I select * from moved', p_start, p_end, p_name);
      execute format('alter table public.price_daily attach partition public.%I for values from (%L) to (%L)',
        p_name, p_start, p_end);
      -- a partíció közvetlenül is lekérdezhető tábla: az RLS rá is kell (4. vasszabály)
      execute format('alter table public.%I enable row level security', p_name);
      created := created + 1;
    end if;
  end loop;
  return created;
end $$;

select public.ensure_price_daily_partitions((current_date - interval '4 months')::date, 18);

create table public.product_tags (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  tag text not null check (tag ~ '^[a-z_]+:[a-z0-9_]+$'),
  source text not null check (source in ('rule', 'feed', 'editor', 'ai_extracted')),
  evidence text,
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, tag),
  -- AI-kinyerésnél kötelező a szó szerinti bizonyíték, és csak jóváhagyva számít
  check (source <> 'ai_extracted' or evidence is not null)
);
create index product_tags_tag_idx on public.product_tags (tag) where approved;

create table public.usage_defaults (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null unique references public.categories (id) on delete cascade,
  unit text not null check (unit in ('ml', 'g', 'db')),
  daily_amount numeric(8, 3) not null check (daily_amount > 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.namedays (
  id uuid primary key default gen_random_uuid(),
  month smallint not null check (month between 1 and 12),
  day smallint not null check (day between 1 and 31),
  name text not null,
  name_normalized text generated always as (public.f_normalize(name)) stored,
  -- a név fő névnapja (MEK „*” jelölés)
  is_primary boolean not null default false,
  -- a közkeletű naptárakban is ezen a napon szerepel
  in_calendar boolean not null default false,
  calendar_rank smallint,
  source text not null,
  created_at timestamptz not null default now(),
  unique (name, month, day)
);
create index namedays_name_normalized_idx on public.namedays (name_normalized);
create index namedays_date_idx on public.namedays (month, day);

-- updated_at triggerek
do $$
declare t text;
begin
  foreach t in array array['networks', 'merchants', 'feeds', 'feed_runs', 'brands', 'categories',
    'category_mappings', 'products', 'source_items', 'offers', 'product_tags', 'usage_defaults']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_updated_at', t);
  end loop;
end $$;
