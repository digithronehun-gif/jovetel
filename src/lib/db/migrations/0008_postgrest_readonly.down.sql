drop index if exists public.feed_runs_one_running_idx;
drop trigger if exists profiles_protect_role on public.profiles;
drop function if exists public.protect_profile_role();
alter default privileges in schema public grant insert, update, delete on tables to authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
