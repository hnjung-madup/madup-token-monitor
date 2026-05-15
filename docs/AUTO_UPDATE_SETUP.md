# 자동 업데이트 셋업 (Tauri Updater)

GitHub Releases 기반으로 사내 동료가 앱을 받은 뒤 새 버전이 나올 때마다 자동 알림 → 업데이트되는 흐름입니다.

흐름:
```
git tag v0.x.y → push → release.yml 워크플로우 실행
  → tauri-action 빌드(arm64 + x86_64) + 서명 + GitHub Release 생성
  → latest.json + .dmg / .app.tar.gz 자동 업로드
앱 실행 → updater plugin이 endpoint 의 latest.json 조회
  → 새 버전이면 다운로드 + 서명 검증 후 자동 업데이트
```

---

## 1회성 셋업 (최초 1회)

### 1.1 서명 키쌍 생성

업데이트 패키지 무결성 검증용. 개인키는 절대 저장소에 커밋하지 않는다.

```bash
mkdir -p ~/.tauri
pnpm tauri signer generate -w ~/.tauri/madup-token-monitor.key
```

비밀번호 입력 → 다음 두 파일이 만들어집니다:
- `~/.tauri/madup-token-monitor.key` — **개인키 (secret)**
- `~/.tauri/madup-token-monitor.key.pub` — **공개키**

`.pub` 파일 내용을 복사해서 `src-tauri/tauri.conf.json` 의 `updater.pubkey` 에 붙여넣고 커밋:

```json
"updater": {
  "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6...",
  "endpoints": ["https://github.com/madup-dct/madup-token-monitor/releases/latest/download/latest.json"]
}
```

### 1.2 GitHub Repository Secrets 등록

Settings → Secrets and variables → Actions → New repository secret. 4개 등록:

| Secret 이름 | 값 |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | `~/.tauri/madup-token-monitor.key` 파일 **전체 내용** |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 1.1에서 입력한 비밀번호 |
| `VITE_SUPABASE_URL` | `.env` 의 동일 값 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env` 의 동일 값 |

CLI로도 가능:
```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/madup-token-monitor.key
gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD
gh secret set VITE_SUPABASE_URL
gh secret set VITE_SUPABASE_PUBLISHABLE_KEY
```

---

## 매 릴리스마다

### 2.1 버전 올리기

`src-tauri/tauri.conf.json` + `package.json` 의 `version` 동기화:

```bash
# 둘 다 0.1.1 로
sed -i '' 's/"version": "0.1.0"/"version": "0.1.1"/' src-tauri/tauri.conf.json package.json
git commit -am "chore: bump version to 0.1.1"
```

### 2.2 태그 push

```bash
git tag v0.1.1
git push origin main v0.1.1
```

→ `.github/workflows/release.yml` 이 자동 실행됨 (~10분).

### 2.3 Draft Release 검토 후 발행

`releaseDraft: true` 로 설정되어 있어 자동 publish 되지 않습니다.

1. https://github.com/madup-dct/madup-token-monitor/releases 진입
2. 생성된 **Draft** Release 확인 (latest.json + 두 개 dmg/zip 첨부 확인)
3. Release notes 보강 후 **Publish** 클릭

→ `latest.json` 의 endpoint URL 이 살아나면서 기존 사용자들에게 자동 업데이트 알림이 뜸.

---

## 동작 확인

### 로컬 테스트
```bash
# 0.1.0 짜리 .app 을 /Applications/ 에 설치
# 0.1.1 release publish
# 0.1.0 앱 재실행 → 30초 내에 업데이트 dialog
```

### 디버그
업데이트 체크가 실패하면 앱 콘솔에서 `[updater]` 로그 확인. 자주 보는 케이스:
- **공개키 mismatch**: tauri.conf.json 의 pubkey 가 빌드 시 사용된 개인키와 짝이 안 맞음 → 키 새로 생성한 뒤 빌드 안 함
- **endpoint 401/403**: latest.json 이 비공개 라이센스에 가려짐 → repo public 또는 별도 호스팅
- **signature fail**: 빌드 환경의 `TAURI_SIGNING_PRIVATE_KEY` 가 다른 키쌍이거나 비밀번호 mismatch

---

## 보안 주의

- `~/.tauri/madup-token-monitor.key` 는 절대 커밋 금지. 잃으면 모든 사용자가 새 키로 재배포 받아야 함 (자동 업데이트 끊김)
- `tauri.conf.json` 에는 **공개키만** 들어가야 함. 시작 부분이 `untrusted comment: minisign public key:` 인지 확인
- 서명 비밀번호도 secret 로만 관리. 평문 저장 금지

---

## frontend 에서 수동 업데이트 체크 (선택)

기본은 앱 시작 시 자동 체크. 사용자가 Settings → "지금 업데이트 확인" 버튼을 원하면 `@tauri-apps/plugin-updater` 의 `check()` 호출. (현 시점 미구현 — 필요 시 추가)
