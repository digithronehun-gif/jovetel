drop function if exists public.search_tsquery(text);
drop text search configuration if exists public.simple_unaccent;
drop text search configuration if exists public.hu_unaccent;
drop function if exists public.set_updated_at();
drop function if exists public.f_normalize(text);
drop function if exists public.f_unaccent(text);
-- a kiterjesztéseket és az extensions sémát nem töröljük: Supabase-en megosztottak
