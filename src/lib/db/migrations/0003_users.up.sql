-- 0003 · Felhasználói táblák (DATA_MODEL 3. pont). A profil 1:1 az auth.users-szel.
-- Minden felhasználói táblán user_id + RLS (0005); a lekérdező réteg userId-val szűr (4. vasszabály).
set search_path = "$user", public, extensions;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  first_name text,
  use_case text check (use_case in ('gifts', 'beauty', 'both')),
  skin_type text check (skin_type in ('normal', 'szaraz', 'zsiros', 'kombinalt', 'erzekeny', 'nem_tudom')),
  skin_concerns text[] not null default '{}' check (cardinality(skin_concerns) <= 3),
  avoid_ingredients text[] not null default '{}',
  budget_band text check (budget_band in ('u5', '5_15', '15_30', 'o30')),
  favorite_merchant_ids uuid[] not null default '{}',
  digest_time time not null default '07:30',
  onboarding_completed_at timestamptz,
  onboarding_step smallint not null default 0,
  role text not null default 'user' check (role in ('user', 'admin')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Hozzájárulások: CSAK HOZZÁFŰZÉS, az aktuális állapot a legutolsó sor (típusonként)
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  -- névtelen látogató süti-hozzájárulásához: a sütiben tárolt véletlen azonosító
  anon_id text,
  type text not null check (type in ('service_email', 'marketing_email', 'analytics', 'marketing', 'terms', 'privacy')),
  granted boolean not null,
  version text not null,
  source text not null,
  created_at timestamptz not null default now(),
  check (user_id is not null or email is not null or anon_id is not null)
);
create index consents_user_type_idx on public.consents (user_id, type, created_at desc) where user_id is not null;
create index consents_email_idx on public.consents (email, type, created_at desc) where email is not null;

create or replace function public.consents_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'A consents tábla csak hozzáfűzhető (új sort írj a módosítás helyett).';
end $$;
create trigger consents_no_update before update on public.consents
  for each row execute function public.consents_append_only();

create table public.loved_ones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  nickname text not null check (length(nickname) between 1 and 40),
  relation text not null check (relation in ('anya', 'apa', 'par', 'barat', 'baratno', 'testver', 'gyerek', 'nagyszulo', 'kollega', 'egyeb')),
  first_name text check (first_name is null or length(first_name) <= 40),
  nameday_month smallint check (nameday_month between 1 and 12),
  nameday_day smallint check (nameday_day between 1 and 31),
  birthday_month smallint check (birthday_month between 1 and 12),
  birthday_day smallint check (birthday_day between 1 and 31),
  birth_year smallint check (birth_year between 1900 and 2100),
  interests text[] not null default '{}',
  budget_band text check (budget_band in ('u5', '5_15', '15_30', 'o30')),
  note text check (note is null or length(note) <= 500),
  avoid text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((nameday_month is null) = (nameday_day is null)),
  check ((birthday_month is null) = (birthday_day is null))
);
create index loved_ones_user_idx on public.loved_ones (user_id);

create table public.occasions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  loved_one_id uuid references public.loved_ones (id) on delete cascade,
  type text not null check (type in ('birthday', 'nameday', 'christmas', 'mothers_day', 'fathers_day', 'valentines', 'womens_day', 'mikulas', 'anniversary', 'custom')),
  label text,
  month smallint check (month between 1 and 12),
  day smallint check (day between 1 and 31),
  remind_offsets smallint[] not null default '{10,3}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index occasions_user_idx on public.occasions (user_id);
-- automatikus alkalomból szerettenként egy-egy (az egyéni alkalom többször is lehet)
create unique index occasions_auto_unique on public.occasions (loved_one_id, type)
  where loved_one_id is not null and type not in ('custom', 'anniversary');

create table public.gift_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  loved_one_id uuid not null references public.loved_ones (id) on delete cascade,
  occasion_type text,
  year smallint check (year between 2000 and 2100),
  product_id uuid references public.products (id) on delete set null,
  free_text text,
  source text not null check (source in ('manual', 'click_confirm')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (product_id is not null or free_text is not null)
);
create index gift_history_loved_one_idx on public.gift_history (loved_one_id);

-- A Lista az egyetlen primitív: kívánságlista, ajándékötletek, szerkesztői útmutató és (2. hónap) creator-kollekció
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (user_id) on delete cascade,
  type text not null check (type in ('wishlist', 'gift_ideas', 'editorial', 'creator')),
  title text not null check (length(title) between 1 and 120),
  slug text,
  intro text,
  cover_slot text,
  cover_image_url text,
  loved_one_id uuid references public.loved_ones (id) on delete set null,
  occasion_type text,
  occasion_date date,
  visibility text not null default 'private' check (visibility in ('private', 'link', 'public')),
  share_token text unique check (share_token is null or length(share_token) >= 32),
  surprise_mode boolean not null default true,
  is_indexable boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_indexable or type = 'editorial')
);
create index lists_owner_idx on public.lists (owner_id);
create unique index lists_public_slug_unique on public.lists (slug) where type in ('editorial', 'creator') and slug is not null;

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  note text check (note is null or length(note) <= 500),
  priority text not null default 'nice' check (priority in ('must', 'nice')),
  price_at_add_huf integer check (price_at_add_huf is null or price_at_add_huf > 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (list_id, product_id)
);
create index list_items_list_idx on public.list_items (list_id, position);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  list_item_id uuid not null references public.list_items (id) on delete cascade,
  reserver_user_id uuid not null references public.profiles (user_id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'cancelled', 'purchased')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Egy tételt egyszerre egy ember foglalhat (a visszavont foglalás nem blokkol)
create unique index reservations_one_per_item on public.reservations (list_item_id)
  where status in ('active', 'purchased');
create index reservations_reserver_idx on public.reservations (reserver_user_id);

create table public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  target_price_huf integer not null check (target_price_huf > 0),
  is_active boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table public.shelf_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  size_value numeric(10, 2) check (size_value is null or size_value > 0),
  size_unit text check (size_unit in ('ml', 'g', 'db')),
  opened_at date not null default current_date,
  pace text not null default 'normal' check (pace in ('slow', 'normal', 'fast')),
  est_runout_date date,
  status text not null default 'active' check (status in ('active', 'finished', 'archived')),
  cycle smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shelf_items_user_idx on public.shelf_items (user_id, status);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  dedupe_key text not null unique,
  scheduled_for date not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped', 'failed')),
  sent_at timestamptz,
  email_id text,
  digest_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_due_idx on public.notifications (scheduled_for, status);
create index notifications_user_idx on public.notifications (user_id, scheduled_for);

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and position('@' in email) > 1),
  use_case text check (use_case in ('gifts', 'beauty', 'both')),
  source jsonb not null default '{}',
  confirmed_at timestamptz,
  confirm_token_hash text,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['profiles', 'loved_ones', 'occasions', 'gift_history', 'lists', 'list_items',
    'reservations', 'price_alerts', 'shelf_items', 'notifications', 'waitlist']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_updated_at', t);
  end loop;
end $$;
