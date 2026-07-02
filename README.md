# 할 일 (Todo)

공책에 그날 할 일을 적고 하나씩 지우는 워크플로우를 옮긴 가볍고 컴팩트한 **데스크톱 투두 앱**.
로그인하면 여러 기기에서 같은 데이터가 동기화된다.

- **날짜별 저널** — 하루가 공책 한 페이지(오늘이 화면을 꽉 채움), 위로 스크롤하면 과거로
- **리치 에디터** — 각 항목에 여러 줄·링크(TipTap)
- **이월(carry-over)** — 어제 못 끝낸 미완료는 오늘로 계속 넘어옴
- **캘린더** — 우상단에서 날짜별 개수 확인·점프
- **테마 5종** — 페이퍼&잉크 · 리갈패드 · 블루프린트 · 미드나잇 · 사쿠라
- **트레이 상주** — 창을 닫아도 종료되지 않고 트레이/메뉴바에 남음

## 다운로드

[**Releases**](https://github.com/0viii0viii/todo/releases) 에서 내려받으세요.

- **macOS**: `.dmg`
- **Windows**: `.exe`(NSIS) 또는 `.msi`

> 코드 서명이 없어 최초 실행 시 경고가 날 수 있습니다.
> macOS는 앱 우클릭 → **열기**, Windows는 SmartScreen에서 **추가 정보 → 실행**.

## 기술 스택

| 층 | 선택 |
|---|---|
| 데스크톱 셸 | Tauri 2 |
| 프론트엔드 | React + TypeScript + Vite |
| 에디터 | TipTap |
| 백엔드/DB/인증 | Supabase (Postgres + Auth, RLS) |

## 개발

요구: Node 20+, Rust(rustup).

```bash
npm install
cp .env.example .env   # Supabase URL / anon key 입력
npm run tauri dev      # 개발 실행
npm run tauri build    # 로컬 설치파일 빌드
```

Supabase 프로젝트를 만들고 `supabase/schema.sql` 을 SQL Editor에서 실행해 테이블·RLS·인덱스를 생성하세요.
`.env` 에는 anon(public) key만 넣습니다(서비스 롤 키 금지). 보안은 DB의 RLS가 강제합니다.

## 배포 (자동)

`v` 로 시작하는 태그를 push하면 GitHub Actions가 macOS·Windows 설치파일을 빌드해
[Releases](https://github.com/0viii0viii/todo/releases) 에 초안으로 올립니다.

```bash
git tag v0.1.0
git push origin v0.1.0
```

빌드 전, 리포지토리 **Settings → Secrets and variables → Actions** 에 다음을 등록하세요:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
