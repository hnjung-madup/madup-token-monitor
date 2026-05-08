# Slack App 설정 가이드 — 기존 사내 App에 추가

매드업 토큰 모니터 앱은 사내에서 이미 운영 중인 Slack App을 재활용해 "Slack으로 로그인" 기능을 사용합니다. 새 App을 만들 필요 없이, **기존 App에 OAuth Redirect URL과 Sign in with Slack 스코프를 추가**하면 됩니다.

이 문서는 사내 IT (또는 사내 Slack App 관리자) 가 따라할 체크리스트입니다.

---

## 사전 준비

| 항목 | 내용 |
|------|------|
| 사내 Slack App 이름 / App ID | 예: `매드업 봇`, `A0XXXXXXXXX` |
| 권한 | 해당 App에 대한 관리자 또는 콜라보레이터 권한 |
| Supabase 프로젝트 | https://supabase.com/dashboard 의 madup-token-monitor 프로젝트 |
| 작업 영향 범위 | **기존 봇/알림 동작에는 영향 없음** — User Scope만 추가하므로 봇 토큰은 재발급 불필요 |

---

## 1단계 — 기존 App 페이지 열기

1. [Slack API 콘솔 — Your Apps](https://api.slack.com/apps) 에 접속.
2. 사내에서 사용 중인 App을 선택 (예: `매드업 봇`).
3. **변경 전** 좌측 메뉴 **Basic Information** → **App-Level Tokens** 와 **OAuth & Permissions** 의 현재 설정을 스크린샷으로 백업 (롤백 대비).

---

## 2단계 — Redirect URL 추가

좌측 메뉴 **OAuth & Permissions** 진입.

### Redirect URLs 섹션

**Add New Redirect URL** 클릭 후 아래 두 개를 **기존 URL을 지우지 말고 추가만**:

```
madup-token-monitor://auth/callback
https://<your-supabase-project>.supabase.co/auth/v1/callback
```

> - 첫 번째: Tauri 데스크톱 앱이 OS 레벨에서 받는 deep-link 콜백
> - 두 번째: Supabase Auth가 Slack OIDC 응답을 받는 서버 콜백 (Supabase Dashboard에서 정확한 URL 확인 — 5단계 참고)

**Save URLs** 클릭.

---

## 3단계 — User Token Scopes 추가

같은 **OAuth & Permissions** 페이지의 **Scopes** 섹션.

### User Token Scopes (없는 것만 추가)

| Scope | 용도 | 이미 있으면 |
|-------|------|------------|
| `openid` | OpenID Connect 인증 | skip |
| `email` | 이메일 주소 조회 (매드업 도메인 검증용) | skip |
| `profile` | 이름, 아바타 조회 | skip |

> **봇 토큰 스코프는 건드리지 마세요.** Sign in with Slack은 User Scope만 사용합니다.

스코프를 추가했다면 페이지 상단에 노란 배너로 **"You'll need to reinstall your app for any changes to take effect."** 가 뜹니다 — **이때는 재설치 필요**. 그러나 OAuth는 사용자별 동의 흐름이라 봇 토큰은 그대로 유지됩니다.

**Reinstall to Workspace** 클릭 → 권한 화면에서 **허용** 클릭.

---

## 4단계 — Client ID / Secret 확인

좌측 메뉴 **Basic Information** → **App Credentials** 섹션:

- **Client ID** — Supabase에 입력
- **Client Secret** — **Show** 클릭 후 복사 (외부 공유 금지)
- **Signing Secret** — Supabase에는 불필요 (봇 이벤트 검증용이므로 그대로 둠)

> Client Secret은 1Password / AWS Secrets Manager 등 사내 비밀 저장소에 보관 후 Supabase 설정에만 사용. 앱 코드/리포지토리에 절대 커밋 금지.

---

## 5단계 — Supabase Auth Slack(OIDC) Provider 연결

1. https://supabase.com/dashboard → `madup-token-monitor` 프로젝트
2. 좌측 **Authentication** → **Providers** 탭
3. **Slack (OIDC)** 행 → **Enable** 토글 ON
4. 아래 값 입력:

| 필드 | 값 |
|------|-----|
| Client ID | 4단계의 Client ID |
| Client Secret | 4단계의 Client Secret |

5. 화면에 표시되는 **Callback URL (for OAuth)** 을 복사 — 이 값이 2단계의 Supabase 쪽 Redirect URL과 일치해야 함. 일치하지 않으면 2단계로 돌아가 정확한 URL로 교체.
6. **Save** 클릭.

---

## 6단계 — 매드업 워크스페이스 제한 (선택)

기본적으로 Supabase는 `0001_init.sql` 마이그레이션의 트리거로 `@madup.com` 이메일만 허용합니다. 추가로 Slack 워크스페이스 ID로도 제한하고 싶다면:

1. Slack API 콘솔에서 사내 워크스페이스 `team_id` 확인 (예: `T0XXXXXX`)
2. Supabase SQL Editor에서 트리거를 보강 (선택):

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

## 7단계 — 동작 확인

앱(`pnpm tauri dev` 또는 빌드된 .dmg/.msi)에서:

1. 로그인 페이지 → **Slack으로 로그인** 클릭
2. 외부 브라우저에서 사내 Slack 인증 화면 표시 → **허용** 클릭
3. `madup-token-monitor://auth/callback?code=...` 로 리다이렉트 → 앱이 포그라운드로 돌아와 로그인 완료
4. 우측 상단에 본인 Slack 프로필(이름/아바타) 표시 확인

---

## 사내 IT 요청 템플릿

기존 App 관리자가 다른 사람이라면 아래 메시지를 그대로 복붙해서 요청:

```
[요청] 기존 사내 Slack App 'XX봇'에 madup-token-monitor 로그인용 설정 추가

영향 범위: User Scope 추가 + Redirect URL 추가 (봇 동작 영향 없음)

추가해주실 항목:
1. OAuth & Permissions → Redirect URLs
   - madup-token-monitor://auth/callback
   - https://<supabase-project>.supabase.co/auth/v1/callback
2. OAuth & Permissions → User Token Scopes
   - openid
   - email
   - profile
3. Reinstall to Workspace 후 Client ID / Client Secret 전달
   (Client Secret은 1Password/Slack DM으로 안전하게)

근거: 매드업 사내 토큰 모니터 데스크톱 앱의 SSO 로그인.
참고 문서: docs/SLACK_APP_SETUP.md
```

---

## 환경 변수

`.env` (앱 빌드 시):

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

> Slack Client ID/Secret은 Supabase Dashboard에만 입력. 앱 측에는 노출 X.

---

## 트러블슈팅

| 증상 | 원인 / 해결 |
|------|-----------|
| `redirect_uri_mismatch` | Redirect URL 정확히 복사됐는지 확인. 끝에 `/` 유무 주의. |
| 로그인 후 앱이 안 열림 | macOS: `Info.plist` deep-link scheme 등록 / Windows: 레지스트리 등록 — Tauri 빌드시 자동 처리됨. dev 모드에서는 `pnpm tauri dev` 재시작 필요. |
| `email_provider_disabled` | Supabase Authentication → Providers에서 Slack(OIDC) 활성화 누락. |
| 매드업 외 이메일로 가입됨 | `0001_init.sql` 트리거가 적용되지 않음. SQL Editor에서 트리거 존재 여부 확인. |

---

문의: 개발팀 Slack 채널 `#dev-infra`
