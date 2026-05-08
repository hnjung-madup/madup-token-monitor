# Slack App 설정 가이드 (사내 IT용)

매드업 토큰 모니터 앱에서 "Slack으로 로그인" 기능을 사용하려면 아래 절차를 따라 Slack App을 생성하고 Supabase에 연결해야 합니다.

---

## 사전 준비

- Slack 워크스페이스 관리자 권한
- Supabase 프로젝트 관리자 권한

---

## 1단계: Slack App 생성

1. [Slack API 콘솔](https://api.slack.com/apps)에 접속합니다.
2. **Create New App** 클릭 → **From scratch** 선택합니다.
3. App 이름: `매드업 토큰 모니터` (또는 원하는 이름)
4. 워크스페이스: `Madup` 선택 → **Create App** 클릭합니다.

---

## 2단계: OAuth & Permissions 설정

좌측 메뉴 **OAuth & Permissions** 클릭 후 아래를 설정합니다.

### Bot Token Scopes (최소 권한)

| Scope | 용도 |
|-------|------|
| `openid` | OpenID Connect 인증 |
| `email` | 이메일 주소 조회 |
| `profile` | 이름, 아바타 조회 |

> **참고**: `users:read`, `users:read.email`은 Bot 스코프가 아닌 User 스코프입니다.  
> Supabase OIDC 연동은 `openid email profile`만 있으면 충분합니다.

### Redirect URLs

**Add New Redirect URL**에 아래 두 URL을 추가합니다:

```
madup-token-monitor://auth/callback
```

> Tauri deep-link 스킴입니다. 앱이 설치된 환경에서 OAuth 콜백을 수신합니다.

---

## 3단계: Client ID / Secret 확인

좌측 메뉴 **Basic Information** → **App Credentials** 섹션에서 확인합니다:

- **Client ID**: `SLACK_CLIENT_ID`
- **Client Secret**: `SLACK_CLIENT_SECRET`

---

## 4단계: Supabase Auth Slack Provider 연결

1. [Supabase Dashboard](https://supabase.com/dashboard) → 해당 프로젝트 선택
2. 좌측 **Authentication** → **Providers** 탭 클릭
3. **Slack (OIDC)** 항목을 찾아 **Enable** 토글 켜기

> [Supabase Auth Providers 화면 캡처 placeholder]

4. 아래 값을 입력합니다:

| 필드 | 값 |
|------|-----|
| Client ID | 3단계에서 복사한 Client ID |
| Client Secret | 3단계에서 복사한 Client Secret |

5. **Redirect URL (callback URL)** 란에 표시된 Supabase 콜백 URL을 복사합니다.  
   형식: `https://<your-project>.supabase.co/auth/v1/callback`

6. 위 URL을 Slack App의 Redirect URLs에도 추가합니다 (2단계로 돌아가 추가).

7. **Save** 클릭합니다.

> [Supabase Slack provider 설정 화면 캡처 placeholder]

---

## 5단계: 앱 환경 변수 설정

앱 배포 시 `.env` 파일 (또는 환경변수)에 아래 값을 설정합니다:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

> Slack Client ID/Secret은 **Supabase에만** 입력하며, 앱 환경변수에는 포함하지 않습니다.

---

## 6단계: 도메인 제한 확인

Supabase DB에 `validate_email_domain` 트리거가 적용되어 있어  
`@madup.com` 이외의 이메일로는 가입/로그인이 차단됩니다.

별도 설정 없이 마이그레이션 실행 시 자동으로 적용됩니다.

---

## 완료 확인

앱을 실행하고 **Slack으로 로그인** 버튼을 클릭했을 때:

1. 외부 브라우저에서 Slack 인증 페이지가 열립니다.
2. 인증 완료 후 `madup-token-monitor://auth/callback?code=...` 로 리다이렉트됩니다.
3. 앱이 포그라운드로 돌아오며 로그인이 완료됩니다.

문의: 개발팀 Slack 채널 `#dev-infra`
