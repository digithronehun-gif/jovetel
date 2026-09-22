-- 0004 · Követés és mérés (DATA_MODEL 4. pont). IP és UA csak sózott hash-ként (CLAUDE.md 10. pont).
set search_path = "$user", public, extensions;

create table public.clicks (
  id uuid primary key default gen_random_uuid(),
  click_id text not null unique check (click_id ~ '^[0-9A-Za-z]{12}$'),
  offer_id uuid references public.offers (id) on delete set null,
  merchant_id uuid references public.merchants (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  session_id text,
  placement text,
  content_ref text,
  ip_hash text,
  ua_hash text,
  is_bot boolean not null default false,
  created_at timestamptz not null default now()
);
create index clicks_created_idx on public.clicks (created_at);
create index clicks_merchant_idx on public.clicks (merchant_id, created_at);
create index clicks_user_idx on public.clicks (user_id) where user_id is not null;

create table public.conversions (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.networks (id),
  network_transaction_id text not null,
  click_id text,
  merchant_id uuid references public.merchants (id) on delete set null,
  order_value_huf integer,
  commission_huf integer,
  status text not null check (status in ('pending', 'approved', 'rejected')),
  occurred_at timestamptz not null,
  updated_from_network_at timestamptz,
  raw jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (network_id, network_transaction_id)
);
create index conversions_click_idx on public.conversions (click_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid references auth.users (id) on delete set null,
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index events_name_created_idx on public.events (name, created_at);

create table public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('interpret', 'explain')),
  user_id uuid references auth.users (id) on delete set null,
  input_hash text not null,
  model text,
  tokens_in integer,
  tokens_out integer,
  cost_huf numeric(8, 3),
  cache_hit boolean not null default false,
  validator_passed boolean,
  latency_ms integer,
  -- a kinyert séma (a felhasználó nyers szövegét NEM tároljuk)
  output jsonb,
  created_at timestamptz not null default now()
);
create index ai_requests_created_idx on public.ai_requests (created_at);

create table public.ai_explanations (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  text text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  diff jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

create trigger conversions_updated_at before update on public.conversions
  for each row execute function public.set_updated_at();
