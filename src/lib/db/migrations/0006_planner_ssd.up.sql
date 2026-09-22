-- 0006 · Tervező-beállítás SSD-re (a Supabase alapértéke is 1.1). A helyi Postgres alapból 4.0-t használ,
-- ami miatt a GIN-index helyett teljes táblabejárást választ a keresésnél (F1 mérés: p95 674 ms → cél < 50 ms).
do $$
begin
  execute format('alter database %I set random_page_cost = 1.1', current_database());
exception when insufficient_privilege then
  raise notice 'random_page_cost nem állítható ezen a szerveren (Supabase-en eleve 1.1).';
end $$;
