-- 0007 · Névkeresés: jelöltek és relevancia egy helyen (PRODUCT_SPEC 7.2 „relevancia”: FTS ts_rank_cd +
-- trigram-hasonlóság, normalizálva). Kétlépcsős, hogy 50 000 terméken is gyors legyen (F1: p95 < 50 ms):
--   1. előszűrés: a GIN-index találataiból a `candidates` legjobb az olcsó ts_rank szerint,
--   2. újrarangsor: 0,7 · ts_rank_cd/(1+ts_rank_cd) + 0,3 · word_similarity,
--   3. ha az FTS kevesebb, mint `lim` találatot ad (elírás), ékezetmentes szó-trigram visszaesés.
set search_path = "$user", public, extensions;

create or replace function public.search_products(q text, lim integer default 24, candidates integer default 200)
returns table (product_id uuid, relevance real, matched_by text)
language plpgsql stable parallel safe as $$
declare
  tsq tsquery := public.search_tsquery(q);
  norm text := public.f_normalize(coalesce(q, ''));
  n integer := 0;
begin
  if tsq is not null then
    return query
      with pre as (
        select p.id, p.search_vector, p.name_normalized
        from public.products p
        where p.search_vector @@ tsq
        order by ts_rank(p.search_vector, tsq) desc
        limit candidates
      )
      select pre.id,
        (0.7 * (ts_rank_cd(pre.search_vector, tsq) / (1 + ts_rank_cd(pre.search_vector, tsq)))
          + 0.3 * word_similarity(norm, pre.name_normalized))::real,
        'fts'::text
      from pre
      order by 2 desc
      limit lim;
    get diagnostics n = row_count;
  end if;
  if n < lim and length(norm) >= 3 then
    return query
      select p.id, (0.3 * word_similarity(norm, p.name_normalized))::real, 'trigram'::text
      from public.products p
      where norm <% p.name_normalized
        and (tsq is null or not (p.search_vector @@ tsq))
      order by word_similarity(norm, p.name_normalized) desc
      limit lim - n;
  end if;
end $$;
