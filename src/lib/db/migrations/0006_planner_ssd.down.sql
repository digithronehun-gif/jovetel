do $$
begin
  execute format('alter database %I reset random_page_cost', current_database());
exception when insufficient_privilege then
  null;
end $$;
