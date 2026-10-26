-- 第二步：不用登入的版本。在 SQL Editor 貼上整段，按 Run 一次即可
alter table public.board drop constraint if exists board_id_fkey;
alter table public.saves drop constraint if exists saves_id_fkey;
create table if not exists public.players (id uuid primary key, h text not null, created timestamptz not null default now());
alter table public.players enable row level security;
create or replace function public.hg_check(p_id uuid, p_secret text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_id is null or p_secret is null or char_length(p_secret) < 20 then raise exception 'bad secret'; end if;
  insert into players (id, h) values (p_id, md5(p_secret)) on conflict (id) do nothing;
  if not exists (select 1 from players where id = p_id and h = md5(p_secret)) then raise exception 'not owner'; end if;
end $$;
create or replace function public.hg_put(p_tb text, p_id uuid, p_secret text, p_j text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform hg_check(p_id, p_secret);
  if p_tb = 'board' then
    if char_length(p_j) >= 3000 then raise exception 'too big'; end if;
    insert into board (id, j, t) values (p_id, p_j, now()) on conflict (id) do update set j = excluded.j, t = now();
  elsif p_tb = 'saves' then
    if char_length(p_j) >= 300000 then raise exception 'too big'; end if;
    insert into saves (id, j, t) values (p_id, p_j, now()) on conflict (id) do update set j = excluded.j, t = now();
  else raise exception 'bad table'; end if;
end $$;
create or replace function public.hg_get_save(p_id uuid, p_secret text) returns text
language plpgsql security definer set search_path = public as $$
begin
  perform hg_check(p_id, p_secret);
  return (select j from saves where id = p_id);
end $$;
revoke all on function public.hg_check(uuid, text) from public, anon, authenticated;
grant execute on function public.hg_put(text, uuid, text, text) to anon, authenticated;
grant execute on function public.hg_get_save(uuid, text) to anon, authenticated;
