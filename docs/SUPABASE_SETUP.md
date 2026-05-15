# Supabase 설정 가이드

이 앱은 Supabase 를 다음 용도로 사용합니다.

| 영역 | 용도 |
|---|---|
| Auth | Slack OIDC 로그인 (PKCE / implicit 둘 다 처리) |
| Postgres | `profiles`, `messages`, `usage_aggregates`, `mcp_aggregates`, `plugin_aggregates` |
| Realtime | 팀 채팅 (#general 채널) `messages` 테이블 INSERT/DELETE 구독 |
| RPC | `get_top_users`, `get_top_mcp`, `get_top_plugins`, `get_weekly_top10` 등 (사내 집계) |

## 1. 프로젝트 생성 (이미 됐다면 스킵)

1. https://supabase.com/dashboard → **New project**
2. 리전: 가까운 곳 (도쿄/서울)
3. Postgres password: 안전한 곳에 보관 (DB 직접 접속 시 필요. 평소엔 publishable key 만 사용)

## 2. Slack OIDC provider 활성화

> Slack App 자체 설정은 `docs/SLACK_APP_SETUP.md`. 여기는 그 결과를 Supabase 에 붙이는 단계.

1. Dashboard → **Authentication → Providers** → **Slack (OIDC)** 토글 ON
2. **Client ID**, **Client Secret** 입력 (Slack App Basic Information 에서 복사)
3. 화면 상단의 **Callback URL** 표시 — 보통 `https://<project-ref>.supabase.co/auth/v1/callback`
   이 URL 을 **Slack App 의 Redirect URL** 에 등록해야 함 (`docs/SLACK_APP_SETUP.md` 참고)
4. **Save**

## 3. Redirect URL 화이트리스트 (중요)

**Authentication → URL Configuration**:

### Site URL
앱이 OAuth 후 사용자를 보낼 기본 URL. 우리 흐름은 **GitHub Pages 의 success page** 를 거쳐 deep link 호출:
```
https://madup-dct.github.io/madup-token-monitor/auth-callback/
```

### Additional Redirect URLs
다음 두 개 등록 (정확히 일치해야 함):
```
https://madup-dct.github.io/madup-token-monitor/auth-callback/
madup-token-monitor://auth/callback
```

> 두 번째의 custom URI scheme 은 success page 가 forward 한 deep link 가 supabase 의 auth state 와
> 연결되도록 명시. 만약 success page 를 거치지 않고 deep link 로 직접 redirect 가 필요하면 첫 번째 없이도
> 동작은 하지만, 브라우저 탭이 무한 로딩으로 멈추는 UX 가 발생. 첫 번째를 사용하는 것이 권장.

## 4. 데이터베이스 마이그레이션 적용

`supabase/migrations/*.sql` 의 모든 파일을 순서대로 적용.

### 옵션 A — Supabase CLI

```bash
supabase link --project-ref <project-ref>
supabase db push
```

### 옵션 B — SQL Editor 수동

`supabase/migrations/` 의 파일들을 번호 순서대로 Supabase Dashboard → **SQL Editor → New query** 에
붙여넣고 실행.

> 중요한 마이그레이션:
> - `0001_init.sql` 등 `profiles` / `messages` / `usage_aggregates` / `mcp_aggregates` / `plugin_aggregates` 정의 + RLS
> - `0005_top_users.sql` (또는 그에 해당하는 RPC) — 리더보드. 누락 시 Leaderboard 페이지에서 명시적 에러 메시지 표시.

## 5. RLS (Row Level Security)

이 앱은 RLS 가 활성화된 상태에서 **publishable / anon key** 로 호출. 따라서 마이그레이션의
RLS 정책 (`auth.uid() = id`, `share_consent = true` 인 행만 SELECT 등) 이 그대로 적용되어야 함.

마이그레이션 SQL 안에 모두 정의되어 있으니 추가 작업 없음. (Supabase Dashboard → Authentication →
Policies 에서 검증 가능.)

## 6. Storage 버킷 (선택)

채팅에서 이미지 첨부를 사용하면 `messages` 의 `image_url` 컬럼에 storage URL 을 넣음. 별도 버킷이
필요하면 Dashboard → **Storage → New bucket** 으로 생성 + public 또는 RLS 로 보호.

## 7. API 키 가져오기 (`.env` 와 GitHub Secret 에 들어갈 값)

Dashboard → **Project Settings → API Keys** (또는 `/settings/api-keys`):

| 항목 | 들어갈 자리 | 비고 |
|---|---|---|
| **Project URL** (`https://<project-ref>.supabase.co`) | `VITE_SUPABASE_URL` | 짧은 문자열 |
| **anon public** 또는 **Publishable key** (`sb_publishable_*`) | `VITE_SUPABASE_PUBLISHABLE_KEY` | 클라이언트가 쓰는 키 |
| **service_role** / **Secret key** (`sb_secret_*`) | **절대 사용 금지** (클라이언트 노출 = RLS 우회) | 서버 only |

> 앱 코드의 import 명은 `VITE_SUPABASE_PUBLISHABLE_KEY` 로 통일. Supabase 의 새 key 시스템은
> `sb_publishable_*` 로 prefix. 기존 anon JWT 키 (`eyJ*`) 도 동작하지만 deprecated 권장 안 됨.

## 8. 자주 만나는 함정

- **"Invalid API key" 무한 로딩** = 클라이언트가 등록한 key 가 위 publishable / anon 이 아닌 경우.
  service_role 을 잘못 넣었거나, 다른 프로젝트의 key 를 넣었을 때 발생.
- **OAuth 후 `redirect_uri_mismatch`** = Site URL 또는 Additional Redirect URLs 화이트리스트 누락.
  특히 trailing slash 까지 정확히 일치해야 함.
- **`get_top_users` not found** = 마이그레이션 미적용. SQL Editor 또는 `supabase db push` 다시.
- **CORS 차단** = Supabase 는 일반적으로 CORS 통과. 만약 차단되면 Project URL 이 잘못 들어갔을 가능성.

## 9. 다음 단계

값 확정 후 다음 두 곳에 동일하게 등록:

1. **로컬**: 프로젝트 root 의 `.env` (gitignored)
2. **GitHub Repository Secrets**: `docs/GITHUB_SECRETS.md` 참고
