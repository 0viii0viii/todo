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
