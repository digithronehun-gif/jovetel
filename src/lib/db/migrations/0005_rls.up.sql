-- 0005 · Row Level Security (4. vasszabály: biztonsági háló).
-- Az alkalmazás szerveroldalon, Drizzle-lel ír/olvas, és minden lekérdező függvény userId-val szűr.
-- Az RLS azt garantálja, hogy a publikus anon / authenticated kulccsal (PostgREST) senki ne érjen el
-- más felhasználó adatát, és a katalógust se lehessen kliensből írni.
set search_path = "$user", public, extensions;

-- Minden táblán bekapcsolva; ahol nincs policy, ott a nem-szuperuser szerepkörök semmit nem látnak.
do $$
declare t text;
begin
  foreach t in array array[
    'networks', 'merchants', 'feeds', 'feed_runs', 'brands', 'categories', 'category_mappings', 'products',
    'source_items', 'offers', 'price_daily', 'product_tags', 'usage_defaults', 'namedays',
    'profiles', 'consents', 'loved_ones', 'occasions', 'gift_history', 'lists', 'list_items', 'reservations',
    'price_alerts', 'shelf_items', 'notifications', 'waitlist',
    'clicks', 'conversions', 'events', 'ai_requests', 'ai_explanations', 'audit_log']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- A price_daily partíciói (és az alapértelmezett partíció) is külön táblák
do $$
declare r record;
begin
  for r in select c.relname from pg_inherits i join pg_class c on c.oid = i.inhrelid
           where i.inhparent = 'public.price_daily'::regclass loop
    execute format('alter table public.%I enable row level security', r.relname);
  end loop;
end $$;

-- Saját sorok: user_id = auth.uid()
do $$
declare t text;
begin
  foreach t in array array['loved_ones', 'occasions', 'gift_history', 'price_alerts', 'shelf_items']
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_own', t);
  end loop;
end $$;

create policy profiles_own on public.profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- értesítések és hozzájárulások: csak olvasás a sajátra (írás csak szerveroldalon)
create policy notifications_own_read on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy consents_own_read on public.consents for select to authenticated
  using (user_id = auth.uid());

create policy lists_own on public.lists for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy list_items_own on public.list_items for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid()));

-- Foglalás: CSAK a foglaló látja. A lista gazdája soha (meglepetés-mód a lekérdező rétegben is).
create policy reservations_reserver on public.reservations for all to authenticated
  using (reserver_user_id = auth.uid()) with check (reserver_user_id = auth.uid());

-- Nyilvános, nem személyes katalógusadat olvasható (írni csak a szerver tud)
do $$
declare t text;
begin
  foreach t in array array['brands', 'categories', 'products', 'namedays', 'usage_defaults']
  loop
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_public_read', t);
  end loop;
end $$;

-- Jogosultságok a Supabase alapértelmezése szerint (ott ezek eleve megvannak); a védelmet az RLS adja.
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
