-- 0009_search_stats visszavonása
set search_path = "$user", public, extensions;

drop function if exists public.refresh_catalog_stats(timestamptz);
drop table if exists public.product_stats;
drop table if exists public.offer_stats;
drop function if exists public.offer_shipping_huf(integer, integer, integer);
drop function if exists public.search_match(text, integer);
drop function if exists public.search_tsquery_any(text);

-- a search_tsquery a 0001-es változatára áll vissza (a 0007 search_products is ezt használja)
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
drop function if exists public.search_tsquery_words(text);

drop index if exists public.products_created_idx;
drop index if exists public.products_search_text_trgm_idx;
alter table public.products drop column if exists search_text;
