-- Helyi Postgres előkészítése, hogy úgy viselkedjen, mint egy Supabase adatbázis:
-- szerepkörök (anon, authenticated, service_role, authenticator, supabase_auth_admin) és az
-- `extensions` séma. Supabase-en ezek már léteznek; ott ez a fájl NEM fut.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator login noinherit password 'postgres';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin login createrole password 'postgres';
  end if;
end $$;

grant anon, authenticated, service_role to authenticator;
create schema if not exists extensions;
-- A GoTrue a saját tábláit az auth sémába migrálja (Supabase-en ez eleve létezik)
create schema if not exists auth;
grant usage on schema extensions to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
