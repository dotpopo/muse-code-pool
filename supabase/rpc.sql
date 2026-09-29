-- RPC: atomically take the best available code (most uses left, least recently handed).
create or replace function take_next_code(p_visitor text)
returns table (id bigint, code text, uses_left int)
language sql
as $$
  update codes
  set uses_left = uses_left - 1, last_handed_at = now()
  where id = (
    select id from codes
    where exhausted = false and uses_left > 0
    order by uses_left desc, last_handed_at asc nulls first, id
    limit 1
    for update skip locked
  )
  returning id, code, uses_left;
$$;

-- RPC: add a code (resurrect exhausted one if re-added, dedupe otherwise).
create or replace function add_pool_code(p_code text, p_visitor text)
returns table (status text, id bigint)
language plpgsql
as $$
declare
  v_existing bigint;
  v_exhausted boolean;
begin
  p_code := upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'));
  if length(p_code) < 4 or length(p_code) > 8 then
    return query select 'invalid'::text, null::bigint;
    return;
  end if;

  select c.id, c.exhausted into v_existing, v_exhausted
  from codes c where c.code = p_code limit 1;

  if v_existing is not null then
    if v_exhausted then
      update codes set exhausted = false, uses_left = 25, last_handed_at = null
      where id = v_existing;
      insert into submissions (code_id, visitor_hash) values (v_existing, p_visitor);
      return query select 'revived'::text, v_existing;
    else
      return query select 'duplicate'::text, v_existing;
    end if;
    return;
  end if;

  insert into codes (code) values (p_code) returning codes.id into v_existing;
  insert into submissions (code_id, visitor_hash) values (v_existing, p_visitor);
  return query select 'added'::text, v_existing;
end;
$$;

grant execute on function take_next_code(text) to anon, authenticated;
grant execute on function add_pool_code(text, text) to anon, authenticated;
