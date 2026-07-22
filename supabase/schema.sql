-- Todo App — Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.
-- (테이블 + RLS 정책 + 인덱스 생성)

-- 테이블 -----------------------------------------------------------------
create table if not exists public.todos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  content      text not null check (char_length(content) between 1 and 1000),
  done         boolean not null default false,
  target_date  date not null,                 -- 클라이언트가 '로컬 오늘' 날짜(YYYY-MM-DD)로 세팅
  created_at   timestamptz not null default now(),
  completed_at timestamptz,                    -- 완료 시 now(), 해제 시 null
  sort_order   integer not null default 0,     -- 미완료 항목 수동 정렬 순서
  category     text not null default 'work'    -- 'work'(업무) | 'life'(일상)
                 check (category in ('work', 'life'))
);

-- RLS: 본인 데이터만 접근 --------------------------------------------------
alter table public.todos enable row level security;

drop policy if exists "select own" on public.todos;
drop policy if exists "insert own" on public.todos;
drop policy if exists "update own" on public.todos;
drop policy if exists "delete own" on public.todos;

create policy "select own" on public.todos
  for select using (auth.uid() = user_id);
create policy "insert own" on public.todos
  for insert with check (auth.uid() = user_id);
create policy "update own" on public.todos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on public.todos
  for delete using (auth.uid() = user_id);

-- 조회 성능 --------------------------------------------------------------
create index if not exists todos_user_idx on public.todos (user_id, done, target_date);

-- 노트 (영구 기록 — 포스트잇) ----------------------------------------------
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title      text not null default '',
  content    text not null default '',  -- tiptap html (투두 항목과 동일 포맷)
  tags       text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;

drop policy if exists "notes select own" on public.notes;
drop policy if exists "notes insert own" on public.notes;
drop policy if exists "notes update own" on public.notes;
drop policy if exists "notes delete own" on public.notes;

create policy "notes select own" on public.notes for select using (auth.uid() = user_id);
create policy "notes insert own" on public.notes for insert with check (auth.uid() = user_id);
create policy "notes update own" on public.notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes delete own" on public.notes for delete using (auth.uid() = user_id);

create index if not exists notes_user_idx on public.notes (user_id, updated_at desc);
