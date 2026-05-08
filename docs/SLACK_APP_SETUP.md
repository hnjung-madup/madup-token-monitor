# Slack App 설정 가이드

이 문서는 두 가지 시나리오를 다룹니다:

- **Path A — 개발/테스트용**: 내가 직접 신규 Slack App을 만들어 빠르게 동작 확인
- **Path B — 운영 전환용**: 기존 사내 Slack App으로 교체 (Client ID/Secret만 갈아끼움)

> 두 path는 **앱 코드 수정 없이 환경설정만 바꾸면 전환 가능**합니다. Supabase Auth Slack Provider의 Client ID/Secret만 교체하면 끝.

---

## Path A — 개발/테스트용 (5분 안에 끝)

### 1. App 생성

1. https://api.slack.com/apps → **Create New App** → **From scratch**
2. App 이름: `madup-token-monitor (dev)` (운영 App과 구분되는 이름 권장)
3. 워크스페이스: **Madup 워크스페이스 선택** (본인 매드업 이메일로 도메인 검증 통과시키기 위함)
4. **Create App** 클릭

> 매드업 워크스페이스에 일반 멤버도 App 생성 가능 (Distribute는 admin 승인 필요하지만 SSO 테스트에는 불필요).

### 2. OAuth & Permissions 설정

좌측 **OAuth & Permissions** → 아래 두 가지 설정.

**Redirect URLs** — `Add New Redirect URL`로 두 개 추가:
```
madup-token-monitor://auth/callback
https://<your-supabase-project>.supabase.co/auth/v1/callback
```

`<your-supabase-project>`는 4단계의 Supabase 콜백 URL과 일치해야 함 (Supabase Dashboard → Authentication → Providers → Slack(OIDC) Enable 시 화면에 표시).

**User Token Scopes** — `Add an OAuth Scope`로 세 개 추가:
- `openid`
- `email`
- `profile`

> User Token Scopes에만 추가. Bot Token Scopes는 비워둬도 됨.

**Install to Workspace** 클릭 → **허용**.

### 3. Client ID / Secret 복사

좌측 **Basic Information** → **App Credentials**:
- Client ID 복사
- Client Secret → **Show** → 복사

### 4. Supabase에 입력

1. https://supabase.com/dashboard → 프로젝트 선택
2. **Authentication** → **Providers** → **Slack (OIDC)** **Enable** 토글 ON
3. Client ID, Client Secret 붙여넣기
4. 화면에 표시된 **Callback URL** 을 복사해서 Slack App의 Redirect URLs와 일치하는지 한 번 더 확인 (불일치 시 Slack App에 추가)
5. **Save**

### 5. 앱 환경변수

`.env`:
```env
VITE_SUPABASE_URL=https://<your-supabase-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

> Slack Client ID/Secret은 **Supabase에만** 입력. 앱 측에는 절대 노출 X.

### 6. 동작 확인

```bash
pnpm tauri dev
```

→ 로그인 페이지 → **Slack으로 로그인** 클릭 → 외부 브라우저에서 매드업 워크스페이스 인증 → `madup-token-monitor://auth/callback?code=...` 로 리다이렉트 → 앱이 포그라운드로 돌아오며 로그인 완료.

---

## Path B — 운영 전환 (사내 App으로 교체)

테스트가 끝나고 사내 표준 App으로 교체할 때.

### 핵심 — 코드는 한 줄도 안 바뀜

교체 시 변경되는 것은 단 하나, **Supabase Auth Provider의 Client ID/Secret 값**.

| 변경 필요 | 변경 불필요 |
|----------|------------|
| Supabase Authentication → Providers → Slack(OIDC) → Client ID, Client Secret | 앱 코드, `.env`, deep-link scheme, DB 마이그레이션 |

### 사내 IT(또는 사내 App 관리자)에게 보낼 요청 메시지

아래를 그대로 복붙해서 사내 채널/DM에 전달:

```
[요청] 기존 사내 Slack App 'XX봇'에 madup-token-monitor 로그인용 설정 추가

영향 범위: User Scope 추가 + Redirect URL 추가만. 기존 봇 동작/봇 토큰에는 영향 없음.

추가해주실 항목:
1. OAuth & Permissions → Redirect URLs (기존 URL은 지우지 말고 추가만)
   - madup-token-monitor://auth/callback
   - https://<supabase-project>.supabase.co/auth/v1/callback
2. OAuth & Permissions → User Token Scopes
   - openid
   - email
   - profile
3. Reinstall to Workspace 후 Client ID / Client Secret 전달
   (Client Secret은 1Password 또는 Slack DM으로 안전하게)

근거: 매드업 사내 토큰 모니터 데스크톱 앱의 SSO 로그인.
참고 문서: docs/SLACK_APP_SETUP.md (Path B 섹션)
```

### 받은 후 교체 절차

1. Supabase Dashboard → Authentication → Providers → Slack(OIDC)
2. Client ID, Client Secret을 새 값(사내 App)으로 **덮어쓰기**
3. **Save**
4. 앱 재시작 → 로그인 흐름 재테스트

### 개발용 App 정리 (선택)

운영 전환 후 dev App은 삭제하거나 비활성화:
- https://api.slack.com/apps → 본인이 만든 App → **Settings** → **Basic Information** → 페이지 맨 아래 **Delete App**

---

## 매드업 워크스페이스 제한 (선택, Path A/B 공통)

기본적으로 `0001_init.sql` 트리거가 `@madup.com` 이메일만 허용합니다. 추가로 Slack 워크스페이스 ID로도 제한하고 싶다면:

1. Slack API 콘솔에서 매드업 워크스페이스 `team_id` 확인 (예: `T0XXXXXX`)
2. Supabase SQL Editor에서:

```sql
create or replace function public.validate_madup_workspace()
returns trigger as $$
begin
  if new.raw_user_meta_data->>'provider_id' is not null
     and new.raw_user_meta_data->>'team_id' is distinct from 'T0XXXXXX' then
    raise exception 'Slack 워크스페이스가 매드업이 아닙니다.';
  end if;
  return new;
end;
$$ language plpgsql security definer;
```

---

## 트러블슈팅

| 증상 | 원인 / 해결 |
|------|-----------|
| `redirect_uri_mismatch` | Slack App의 Redirect URLs에 Supabase 콜백 URL과 `madup-token-monitor://auth/callback` 둘 다 정확히 등록됐는지 확인. 끝의 `/` 유무까지 일치시킬 것. |
| 로그인 후 앱이 안 열림 | macOS는 자동, Windows는 첫 실행 시 deep-link 등록. dev 모드에서는 `pnpm tauri dev` 재시작 한 번 필요. |
| `email_provider_disabled` 또는 Slack 옵션 미표시 | Supabase Authentication → Providers → Slack(OIDC) 토글 OFF. ON 후 Save. |
| 매드업 외 이메일로 가입됨 | `0001_init.sql` 트리거 미적용. Supabase SQL Editor에서 `\df+ public.validate_email_domain` 으로 트리거 함수 존재 확인. |
| Path A에서 다른 매드업 동료가 본인 dev App 콜백을 안 받음 | dev App이 Distribute되지 않아서. 본인 단독 테스트만 가능. 여러 명 테스트하려면 Path B로 전환 필요. |

---

문의: 개발팀 Slack 채널 `#dev-infra`
