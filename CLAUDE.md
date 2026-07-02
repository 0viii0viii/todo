# Todo App — Project Spec (for Claude Code)

가볍고 컴팩트한 **데스크톱 투두 앱**. 공책에 그날 할 일을 적고 하나씩 지우는 워크플로우를
디지털로 옮기되, **로그인하면 여러 기기에서 같은 데이터가 보이도록** 동기화한다.
오프라인은 지원하지 않는다(항상 온라인 가정, 서버가 단일 진실원).

---

## 1. 스코프 (중요 — 이 범위만 구현)

**In scope (v1)**
- 할 일 추가 / 완료 체크 / 완료 해제 / 삭제
- 이메일·비밀번호 로그인 (계정별 데이터 격리)
- 멀티 기기 동기화 (서버 fetch 기반)
- **이월(carry-over)**: 어제 못 끝낸 미완료 항목이 오늘 화면에 계속 남고 "이월" 표시

**Out of scope (지금은 만들지 말 것 — backlog)**
- 오프라인 동작 / 로컬 캐시 병합
- 카테고리·태그·우선순위, 반복 할 일, 알림/리마인더
- OAuth(구글/애플/카카오) 로그인
- 통계·대시보드, 공유·협업
> Claude Code에게: 위 backlog 기능을 임의로 추가하지 말 것. 요청 시에만 확장한다.

---

## 2. 기술 스택

| 층 | 선택 | 비고 |
|---|---|---|
| 데스크톱 셸 | **Tauri 2.x** | OS 웹뷰 사용, 바이너리·메모리 최소. Rust 코드 거의 불필요 |
| 프론트엔드 | **React + TypeScript + Vite** | 스캐폴딩 안정성·예제 최다 기준. *유일한 교체 가능 결정* — 더 컴팩트하게 가려면 Svelte로 바꿔도 됨 |
| 백엔드/DB/인증 | **Supabase** (Postgres + Auth) | 백엔드 코드를 직접 짜지 않음. REST/실시간/인증 내장 |
| 클라이언트 SDK | `@supabase/supabase-js` v2 | |

요구 환경: Node.js 20+, Rust(rustup) 설치.

---

## 3. 아키텍처

```
[Tauri window (OS WebView)]
        │  React UI
        │  @supabase/supabase-js
        ▼
[Supabase]  Auth(JWT) ── Postgres(todos) ── (optional) Realtime
```

- Rust(`src-tauri`)는 창을 띄우는 셸 역할만. 비즈니스 로직은 전부 프론트에서 Supabase JS로 처리.
- 인증 세션은 supabase-js가 localStorage에 저장 → Tauri 웹뷰에서 그대로 유지됨.
- 보안은 **RLS(Row Level Security)** 로 DB에서 강제한다. 클라이언트는 anon key만 들고 있으면 됨.

---

## 4. 데이터 모델 & Supabase 스키마

`supabase/schema.sql` — Supabase SQL Editor에서 실행.

```sql
-- 테이블
create table public.todos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  content      text not null check (char_length(content) between 1 and 1000),
  done         boolean not null default false,
  target_date  date not null,                 -- 클라이언트가 '로컬 오늘' 날짜로 세팅 (타임존 주의, §6)
  created_at   timestamptz not null default now(),
  completed_at timestamptz                     -- 완료 시 now(), 해제 시 null
);

-- RLS: 본인 데이터만 접근
alter table public.todos enable row level security;

create policy "select own" on public.todos for select using (auth.uid() = user_id);
create policy "insert own" on public.todos for insert with check (auth.uid() = user_id);
create policy "update own" on public.todos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on public.todos for delete using (auth.uid() = user_id);

-- 조회 성능
create index todos_user_idx on public.todos (user_id, done, target_date);
```

`user_id`는 `default auth.uid()`라 insert 시 클라이언트가 보내지 않아도 됨.

---

## 5. 인증 흐름 (email/password)

- 회원가입: `supabase.auth.signUp({ email, password })`
- 로그인: `supabase.auth.signInWithPassword({ email, password })`
- 로그아웃: `supabase.auth.signOut()`
- 세션 감시: `supabase.auth.onAuthStateChange(...)` + 앱 시작 시 `getSession()`
- 세션 없음 → `AuthForm` 표시, 있음 → `TodoList` 표시.

> OAuth는 backlog. Tauri에서 OAuth 리다이렉트는 deep-link 플러그인이 필요해 복잡하므로 v1은 email/password로 간다.

---

## 6. 이월(carry-over) 로직 — 핵심

날짜를 매일 밀어주는 배치는 **필요 없다.** 쿼리/화면 로직으로 해결한다.

**오늘 화면에 보여줄 것**
1. `done = false` 인 미완료 항목 **전부** (target_date 무관 → 이월분 포함)
2. 오늘 완료한 항목 (`done = true` and `completed_at`가 로컬 오늘 범위)

**이월 배지 조건**: `done === false && target_date < 로컬_오늘` → UI에 "이월" 표시. `target_date`는 원본 날짜로 보존(히스토리 유지).

**⚠ 타임존 주의**: Supabase Postgres 기본 타임존은 UTC라 `current_date`로 "오늘"을 판단하면 KST와 9시간 어긋난다. 따라서:
- `target_date`는 **클라이언트가 로컬 날짜(YYYY-MM-DD)로 계산**해서 insert.
- "오늘 완료분" 필터는 클라이언트가 계산한 로컬 하루 범위(`todayStart`/`todayEnd`, ISO timestamptz)로 `completed_at`을 거른다.
- 즉, 날짜 경계 판단은 DB `current_date`가 아니라 클라이언트 로컬 기준으로 한다.

fetch 예시(개념):
```ts
// 미완료 전부 + 오늘 완료분
const { data } = await supabase
  .from('todos')
  .select('*')
  .or(`done.eq.false,completed_at.gte.${todayStartISO}`)
  .order('done')          // 미완료 먼저
  .order('target_date')
  .order('created_at');
// carried_over 플래그는 클라에서 계산: !t.done && t.target_date < localTodayStr
```

체크 토글: 완료 시 `{ done: true, completed_at: new Date().toISOString() }`, 해제 시 `{ done: false, completed_at: null }`.

---

## 7. 동기화 전략

단일 유저·멀티 기기 + 항상 온라인이므로 **last-write-wins**, 충돌 처리 불필요.

- **기본(권장 v1)**: 창 포커스 시 refetch. `window.addEventListener('focus', refetchTodos)`. 개인 투두엔 이걸로 충분.
- **선택(실시간)**: 다른 기기 변경 즉시 반영이 필요하면 Realtime 구독 추가.
  ```ts
  supabase.channel('todos')
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'todos', filter: `user_id=eq.${userId}` },
        () => refetchTodos())
    .subscribe();
  ```
  (Supabase 대시보드에서 해당 테이블 Realtime publication 활성화 필요.)

---

## 8. 프로젝트 구조

```
todo-app/
├── src/                        # React + TS + Vite
│   ├── lib/supabase.ts         # 클라이언트 초기화
│   ├── hooks/
│   │   ├── useAuth.ts          # 세션 상태
│   │   └── useTodos.ts         # fetch/add/toggle/delete + carry-over
│   ├── components/
│   │   ├── AuthForm.tsx
│   │   ├── AddTodo.tsx
│   │   ├── TodoList.tsx
│   │   └── TodoItem.tsx        # 이월 배지 포함
│   ├── App.tsx                 # 세션 유무로 Auth/List 분기
│   └── main.tsx
├── src-tauri/                  # Tauri 셸 (거의 수정 없음)
│   ├── tauri.conf.json
│   └── src/main.rs
├── supabase/schema.sql
├── .env                        # git 제외
├── .env.example
└── package.json
```

`src/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

---

## 9. 환경 변수 & 보안

`.env` (그리고 `.env.example`에 키 이름만):
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
- **anon key는 클라이언트에 넣어도 안전하다** — 공개용으로 설계됨. 보안은 RLS가 강제.
- **service_role key는 절대 클라이언트/저장소에 넣지 말 것.**
- `.env`는 `.gitignore`에 추가.
- Tauri CSP: `tauri.conf.json`의 `app.security.csp`가 설정돼 있으면 `https://*.supabase.co` (및 wss) 연결을 허용해야 함. 기본 템플릿은 CSP가 비어 있어 그대로 동작하지만, 나중에 CSP를 켤 때 주의.

---

## 10. 스캐폴딩 순서 (Claude Code가 따라갈 순서)

> **사람이 먼저 해야 하는 수동 단계** (Claude Code가 대신 못 함):
> Supabase 웹 콘솔에서 계정·프로젝트 생성 → Project URL과 anon key 확보. 이 값을 `.env`에 넣는다.

1. `npm create tauri-app@latest` → 템플릿: **React + TypeScript**, 패키지 매니저 선택.
2. `npm install`, `npm install @supabase/supabase-js`.
3. `.env` / `.env.example` 작성, `.gitignore`에 `.env` 추가.
4. `supabase/schema.sql` 작성 → (사람이) Supabase SQL Editor에서 실행해 테이블·RLS·인덱스 생성.
5. `src/lib/supabase.ts` 클라이언트 초기화.
6. `useAuth` 훅 + `AuthForm` (email/password 로그인·회원가입·로그아웃).
7. `useTodos` 훅 — fetch(§6 로직)/add/toggle/delete, 로컬 타임존 날짜 처리 포함.
8. `AddTodo`, `TodoList`, `TodoItem`(이월 배지) 조립, `App.tsx`에서 세션 분기.
9. 포커스 시 refetch 연결 (원하면 Realtime 구독).
10. `tauri.conf.json`에서 앱 이름/윈도우 크기(컴팩트하게)/아이콘 정리 → `npm run tauri dev`로 확인.
11. `npm run tauri build`로 배포 바이너리 생성.

---

## 11. Backlog (다음 단계, 지금은 X)
카테고리/태그 · 우선순위 · 반복 할 일 · 알림 · OAuth(deep-link) · 완료 통계 · 오프라인 지원.
