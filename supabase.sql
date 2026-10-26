-- 在 Supabase 的 SQL Editor 貼上整段，按 Run 執行一次即可
create table if not exists public.board (
  id uuid primary key references auth.users(id) on delete cascade,
  j text not null check (char_length(j) < 3000),
  t timestamptz not null default now()
);
create table if not exists public.saves (
  id uuid primary key references auth.users(id) on delete cascade,
  j text not null check (char_length(j) < 300000),
  t timestamptz not null default now()
);
create index if not exists board_t on public.board (t desc);
alter table public.board enable row level security;
alter table public.saves enable row level security;
drop policy if exists "board read" on public.board;
drop policy if exists "board insert own" on public.board;
drop policy if exists "board update own" on public.board;
drop policy if exists "saves read own" on public.saves;
drop policy if exists "saves insert own" on public.saves;
drop policy if exists "saves update own" on public.saves;
create policy "board read" on public.board for select using (true);
create policy "board insert own" on public.board for insert with check (auth.uid() = id);
create policy "board update own" on public.board for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "saves read own" on public.saves for select using (auth.uid() = id);
create policy "saves insert own" on public.saves for insert with check (auth.uid() = id);
create policy "saves update own" on public.saves for update using (auth.uid() = id) with check (auth.uid() = id);
