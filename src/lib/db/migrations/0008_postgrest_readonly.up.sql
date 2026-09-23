-- 0008 · A publikus (anon / authenticated) szerepkörök csak OLVASNAK (független átnézés, F3).
-- Az alkalmazás minden írást a szerveren végez (Server Action / script, jogosultság-ellenőrzéssel, Turnstile-lal,
-- rate limittel). A PostgREST-en át, a publikus kulccsal ezért nem lehet írni: így nem kerülhető meg sem a
-- foglalás védelme, sem a szerepkör. Az RLS marad a biztonsági háló az olvasásra.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke insert, update, delete, truncate on tables from anon, authenticated;

-- A profiles.role csak szerveroldalon (postgres / service_role) állítható — akkor is, ha valaki később újra
-- írásjogot adna az authenticated szerepkörnek.
create or replace function public.protect_profile_role() returns trigger
language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') then
    if (tg_op = 'INSERT' and new.role <> 'user') or (tg_op = 'UPDATE' and new.role is distinct from old.role) then
      raise exception 'A szerepkör csak szerveroldalon állítható.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_protect_role before insert or update on public.profiles
  for each row execute function public.protect_profile_role();

-- Egy feedre egyszerre legfeljebb egy futó import (a párhuzamos futás kétszer növelné a missed_runs-t).
create unique index feed_runs_one_running_idx on public.feed_runs (feed_id) where status = 'running';
