-- 0001 · Kiterjesztések, közös függvények, magyar ékezetfüggetlen keresési konfiguráció (DATA_MODEL 1. pont)
-- Supabase-kompatibilis: a kiterjesztések az `extensions` sémába kerülnek.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- A pg_trgm operátorai és az unaccent névtelenül is elérhetők legyenek (Supabase alapértelmezése)
do $$
begin
  execute format('alter database %I set search_path = "$user", public, extensions', current_database());
end $$;
set search_path = "$user", public, extensions;

-- Immutable unaccent-wrapper, hogy generált oszlopban és indexben is használható legyen
create or replace function public.f_unaccent(text) returns text
language sql immutable parallel safe strict
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

-- Keresésre normalizált szöveg: ékezetmentes, kisbetűs (a lib/format normalizeForSearch párja)
create or replace function public.f_normalize(text) returns text
language sql immutable parallel safe strict
as $$ select lower(public.f_unaccent($1)) $$;

-- hu_unaccent: magyar szótövezés ékezetmentesített szavakon
do $$
begin
  if not exists (select 1 from pg_ts_config where cfgname = 'hu_unaccent') then
    create text search configuration public.hu_unaccent (copy = pg_catalog.hungarian);
    alter text search configuration public.hu_unaccent
      alter mapping for asciiword, asciihword, hword_asciipart, word, hword, hword_part
      with extensions.unaccent, hungarian_stem;
  end if;
end $$;

-- simple_unaccent: szótövezés NÉLKÜL, ékezetmentesen. A magyar Snowball-szótövező ékezetmentes szón
-- következetlen („parfum” → parfu, de „parfumok” → parfum), ezért a keresés a szótő mellett
-- előtag-egyezést is használ ezen a vektoron (lásd search_tsquery).
do $$
begin
  if not exists (select 1 from pg_ts_config where cfgname = 'simple_unaccent') then
    create text search configuration public.simple_unaccent (copy = pg_catalog.simple);
    alter text search configuration public.simple_unaccent
      alter mapping for asciiword, asciihword, hword_asciipart, word, hword, hword_part
      with extensions.unaccent, simple;
  end if;
end $$;

-- Keresőkérdés: szavanként (magyar szótő VAGY ékezetmentes előtag), a szavak között ÉS.
-- A magyar töltelékszavak (a, az, és…) kimaradnak. Csak [a-z0-9] marad a szavakban → nincs injekció.
create or replace function public.search_tsquery(q text) returns tsquery
language plpgsql immutable parallel safe as $$
declare
  w text;
  stem tsquery;
  part tsquery;
  result tsquery;
begin
  for w in select distinct t from regexp_split_to_table(public.f_normalize(coalesce(q, '')), '[^a-z0-9]+') as t
           where length(t) > 0
  loop
    stem := to_tsquery('public.hu_unaccent'::regconfig, w);
    if numnode(stem) = 0 then
      continue; -- töltelékszó
    end if;
    if length(w) >= 3 then
      part := stem || to_tsquery('public.simple_unaccent'::regconfig, w || ':*');
    else
      part := stem;
    end if;
    result := case when result is null then part else result && part end;
  end loop;
  return result; -- üres (csak töltelékszó) kérdésre NULL: semmi nem egyezik
end $$;

-- updated_at karbantartása
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Migrációs napló (a scripts/db/migrate.ts vezeti; itt csak a biztonság kedvéért)
create table if not exists public.app_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);
