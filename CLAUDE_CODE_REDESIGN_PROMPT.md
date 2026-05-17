# 매드업 토큰 모니터 — 전체 UI 리디자인 적용 작업

## 작업 목적

`DESIGN.md` 가 `HP Inspired` (라이트 / 일렉트릭 블루) 에서
`Madup Console` (다크 / 인디고 + 일렉트릭 애저) 로 완전히 새로 작성됐다.

지금까지 트레이 메뉴바 팝오버 (~ 470×800) 였던 앱을 **풀 윈도우 대시보드** 로 전환하면서
탭 구조도 5개 → 3개로 합쳤다. UI 토큰·컴포넌트 클래스·페이지 구조를 새 디자인 시스템에 맞게 전부 교체하라.

## 0. 시작 전 반드시 읽을 것

1. `DESIGN.md` — Madup Console 디자인 시스템 (색 / 타이포 / 컴포넌트 / 레이아웃 토큰)
2. `design/Madup Console — Dashboard.html` — 내 대시보드 (메인) 풀 윈도우 목업
3. `design/Madup Console — Company Dashboard.html` — 사내 대시보드 (MCP + 플러그인 + 리더보드 통합)
4. `design/Madup Console — Team Chat.html` — 팀 채팅
5. `design/theme.css` + `design/theme.js` — 다크/라이트 토글 정의 (CSS 변수 오버라이드 + localStorage 영속화)

목업 HTML 들은 React/Tauri 와 무관한 정적 마크업이지만 **레이아웃 / 간격 / 컴포넌트 구조** 의 단일 진실 (single source of truth) 이다.
모호한 부분이 있으면 목업의 HTML 구조를 우선 참조하라.

## 1. 큰 그림

### 1-1. 윈도우 셸 변경 (트레이 팝오버 → 일반 윈도우)

- `src-tauri/tauri.conf.json` 의 메인 윈도우 설정 변경
  - 기본 크기 **1440 × 900**, 최소 **1200 × 760**
  - `decorations: false` 는 유지하되 (커스텀 트래픽 라이트 사용), 자유롭게 이동·리사이즈 가능하게
  - 트레이 아이콘 클릭 → 윈도우 show/focus (현재의 popover toggle 동작 제거)
  - 상단 36px 영역에 `data-tauri-drag-region` 적용

### 1-2. 네비게이션 재구성

| 이전 (popover) | 이후 (full window) |
|---|---|
| 대시보드 | **내 대시보드** (기존 `Dashboard.tsx`) |
| MCP 분석 | → "사내 대시보드" 로 합침 |
| 플러그인 | → "사내 대시보드" 로 합침 |
| 사내 리더보드 | → "사내 대시보드" 로 합침 |
| 팀 채팅 | **팀 채팅** (기존 `Chat.tsx`) |
| 설정 (헤더 아이콘) | 설정 (사이드바 사용자 블록 안 톱니바퀴 아이콘) |

상단 탭 바 (`TabBar`) 제거. 좌측 **224px 사이드바** 로 교체:

- 상단: 매드업 마크 + `MADUP / TOKEN CONSOLE` 워드마크
- 중간: 3개 네비 아이템 (내 대시보드 / 사내 대시보드 / 팀 채팅)
- 하단: 사용자 블록 (아바타 + 이름 + 이메일 + 테마 토글 + 설정 + 로그아웃)

### 1-3. 색 / 타이포 토큰 전체 교체

`src/index.css` 의 `@theme inline { ... }` 블록을 새 토큰으로 완전 교체.
구 토큰 (예: `--color-primary: #024ad8`, `--color-canvas: #ffffff`) 는 모두 제거하고
새 Madup Console 토큰 (예: `--azure: #4DA3FF`, `--canvas: #0B1126`) 로 대체.

**호환성 shim** 으로 두었던 변수들 (`--color-background`, `--color-card`, `--color-popover` 등) 도
다크 톤으로 매핑해 두되, 새 코드에서는 새 변수 이름을 직접 쓰는 것을 권장.

## 2. 파일별 작업 지시

### 2-1. `src/index.css` — 전면 재작성

`DESIGN.md` 의 front-matter 가 정답이다. 아래 구조로 새로 작성:

```css
@import "pretendard/dist/web/static/pretendard.css";
@import "@fontsource/jetbrains-mono/400.css";  /* pnpm add @fontsource/jetbrains-mono */
@import "@fontsource/jetbrains-mono/500.css";
@import "@fontsource/jetbrains-mono/600.css";
@import "tailwindcss";

@theme inline {
  /* Canvas */
  --color-canvas-deep: #070B17;
  --color-canvas: #0B1126;
  --color-canvas-soft: #11183A;

  /* Surfaces (3 tiers) */
  --color-surface-1: #121A33;
  --color-surface-2: #19233F;
  --color-surface-3: #22304D;

  /* Borders */
  --color-hairline: rgba(255,255,255,0.06);
  --color-hairline-strong: rgba(255,255,255,0.12);

  /* Text */
  --color-text-primary: #E7ECF7;
  --color-text-secondary: #9CA8C5;
  --color-text-tertiary: #6A7593;
  --color-text-faint: #454E6A;
  --color-text-on-accent: #06122B;

  /* Azure (lone accent) */
  --color-azure: #4DA3FF;
  --color-azure-bright: #7BBCFF;
  --color-azure-deep: #2C7BE5;
  --color-azure-soft: rgba(77,163,255,0.14);

  /* Four-light signal */
  --color-lime: #9BE15D;     --color-lime-deep: #6CB23B;     --color-lime-soft: rgba(155,225,93,0.14);
  --color-amber: #F5B544;    --color-amber-deep: #C88A1C;    --color-amber-soft: rgba(245,181,68,0.14);
  --color-coral: #FF6B5C;    --color-coral-deep: #D43F2E;    --color-coral-soft: rgba(255,107,92,0.14);
  --color-violet: #B68CFF;   --color-violet-deep: #8358D9;   --color-violet-soft: rgba(182,140,255,0.14);

  /* Radius scale */
  --radius-xs: 4px; --radius-sm: 6px; --radius-md: 8px; --radius-lg: 10px;
  --radius-xl: 14px; --radius-xxl: 20px; --radius-pill: 9999px;
}

@layer base {
  html, body { background: var(--color-canvas); color: var(--color-text-primary); }
  body {
    font-family: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont,
                 system-ui, "Helvetica Neue", "Noto Sans KR", sans-serif;
    -webkit-font-smoothing: antialiased;
    line-height: 1.45;
  }
  .num {
    font-family: "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace;
    font-feature-settings: "tnum", "zero";
    font-variant-numeric: tabular-nums;
  }
}
```

이전 `hp-*` 유틸리티 (`hp-card-flat`, `hp-btn-primary`, `hp-display-xxl` 등) 는 **전부 삭제**.
새 컴포넌트는 Tailwind 4 의 `@utility` 로 다시 작성하거나 인라인 클래스로 표현.

권장 유틸리티 (추가):

```css
@utility mc-card {
  position: relative;
  background-color: var(--color-surface-1);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-hairline);
  padding: 20px;
  overflow: hidden;
}
@utility mc-card-feature {
  /* same as mc-card but radius xxl + padding 28px */
}
@utility mc-eyebrow {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}
@utility mc-kpi-numeral {
  font-family: "JetBrains Mono", monospace;
  font-size: 48px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--color-azure);
}
/* + mc-btn-primary, mc-segmented, mc-status-pill-* 등 */
```

`card::before` 의 1px 상단 inner-highlight 는 디자인 시스템의 핵심 시그니처다.
`mc-card` 안에 pseudo-element 로 반드시 포함.

### 2-2. `src-tauri/tauri.conf.json`

```jsonc
"windows": [
  {
    "label": "main",
    "title": "매드업 토큰 모니터",
    "width": 1440,
    "height": 900,
    "minWidth": 1200,
    "minHeight": 760,
    "decorations": false,           // 커스텀 트래픽 라이트 사용
    "transparent": false,
    "resizable": true,
    "center": true,
    "visible": false                 // 처음에 숨겼다가 ready 후 show
  }
]
```

`src-tauri/src/main.rs` 의 트레이 동작에서 popover 위치 고정 로직 (트레이 아이콘 위에 띄우는 로직) 제거.
트레이 아이콘 클릭 → 단순 `window.show().focus()`.

### 2-3. `src/App.tsx` — 레이아웃 재구성

`PopoverHeader` + `TabBar` 두 컴포넌트 제거. 대신:

```tsx
function Layout() {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-canvas text-text-primary">
        <TitleBar />                   {/* 36px top, data-tauri-drag-region */}
        <Sidebar />                    {/* 224px left rail */}
        <main className="flex-1 overflow-y-auto px-7 pt-6 pb-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/team" element={<CompanyDashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </AuthGuard>
  );
}
```

- `TitleBar`: 트래픽 라이트 (참고용 시각 요소, 실제 close/minimize 는 Tauri API 와 연결), 중앙 타이틀, 우측 상태 pill (Slack/OAuth 연결 상태)
- `Sidebar`: 목업 HTML 사이드바 구조 그대로. NavLink 3개 + 사용자 블록 + 테마 토글

### 2-4. `src/components/` — 신규 / 갱신

신규:
- `components/layout/TitleBar.tsx`
- `components/layout/Sidebar.tsx`
- `components/ui/KpiCard.tsx` — eyebrow + 큰 mono 숫자 + context row
- `components/ui/Sparkline.tsx` — 인라인 SVG 미니 라인 + 영역 그라데이션
- `components/ui/RingMeter.tsx` — 도넛 미터 (signal-color 4단계 자동 매핑)
- `components/ui/SegmentedBar.tsx` — 기존 12-세그먼트 버전 유지하되 새 토큰으로
- `components/ui/Chip.tsx` — 필터 칩 (active 상태 azure-soft)
- `components/ui/Segmented.tsx` — 두 개 이상 토글 (Tokens/Cost 같은)
- `components/ui/ThemeToggle.tsx` — sun/moon 아이콘 + localStorage 영속화 (`theme.js` 로직 그대로 옮기기)
- `components/charts/DailyBarChart.tsx` — 기존 컴포넌트 새 컬러로 갱신 (azure 그라데이션 + violet "오늘" 막대 + amber 평균 dashed 라인)
- `components/charts/Leaderboard.tsx` — 정렬/필터 가능한 테이블 컴포넌트 (Company Dashboard 목업 `<script>` 로직 React 화)
- `pages/CompanyDashboard.tsx` — MCP / Plugin / Leaderboard 데이터를 한 페이지에 모음

갱신:
- `pages/Dashboard.tsx` — 카드 컴포넌트 모두 `mc-card` 기반으로, KPI 영역은 `KpiCard` 사용
- `pages/Chat.tsx` — 4-column 레이아웃 (사이드바는 이미 외부에서 처리되므로 채널 레일 + 메시지 + 멤버 패널 3-column)
- `components/HeatMap.tsx` — 새 azure 색 램프 + 오늘 셀 violet 강조

삭제 (또는 deprecated):
- `pages/MCP.tsx`
- `pages/Plugins.tsx`
- `pages/Leaderboard.tsx`

`CompanyDashboard.tsx` 에서 위 세 페이지의 기능을 모두 통합:
1. 4-up Hero KPI (전체 토큰 / 비용 / 활성 사용자 / 누적 세션)
2. 사용량 리더보드 + 정렬/필터/검색
3. 모델별 토큰 (전사) + 7일 트렌드 (사이드 카드)
4. 사내 MCP TOP 10 + 사내 플러그인 TOP 10 (2 컬럼)

### 2-5. 라우팅 정리

```tsx
// 기존
<Route path="/" element={<Dashboard />} />
<Route path="/mcp" element={<MCP />} />
<Route path="/plugins" element={<Plugins />} />
<Route path="/leaderboard" element={<Leaderboard />} />
<Route path="/chat" element={<Chat />} />

// 신규
<Route path="/" element={<Dashboard />} />
<Route path="/team" element={<CompanyDashboard />} />
<Route path="/chat" element={<Chat />} />
```

i18n 키도 정리: `nav.mcp`, `nav.plugins`, `nav.leaderboard` 제거 →
`nav.dashboard` (내 대시보드), `nav.team` (사내 대시보드), `nav.chat` (팀 채팅) 만 사용.

### 2-6. 다크/라이트 테마 토글

`design/theme.css` 의 `html.theme-light` 블록을 `src/index.css` 끝에 그대로 옮긴다.
단, Tailwind 4 의 변수 이름 컨벤션 (`--color-*`) 에 맞춰 prefix 만 통일:

```css
html.theme-light {
  --color-canvas: #F2F4F9;
  --color-surface-1: #FFFFFF;
  /* … (theme.css 전체 매핑 참조) … */
}
```

`design/theme.js` 의 토글 로직은 `components/ui/ThemeToggle.tsx` 안으로 옮기되,
초기 적용은 `index.html` 의 `<head>` 안 `<script>` 로 두는 게 좋다 (FOUC 방지):

```html
<script>
  try {
    var t = localStorage.getItem("madup-theme");
    if (t === "light") document.documentElement.classList.add("theme-light");
  } catch (e) {}
</script>
```

## 3. 타이포 / 숫자 표현 규칙

- **모든 숫자 (토큰 수, 비용, 퍼센트, 날짜, 세션 카운트, 타이머)** → `font-mono` 또는 `.num` 클래스 + JetBrains Mono
- 한국어 본문은 Pretendard 그대로 유지
- 버튼 라벨은 **소문자 / 대소문자 혼용 Pretendard 600** — 기존 HP 디자인의 UPPERCASE 버튼 라벨 패턴은 모두 제거
- UPPERCASE + tracking 0.16em 패턴은 **eyebrow 전용** (`.mc-eyebrow`)
- KPI 큰 숫자: `text-[48px] font-medium leading-none tracking-tight` + 색은 azure / amber / lime / violet 중 의미에 맞춰

## 4. 신호 색 (Four-light signal) 사용 규칙

| 의미 | 색 | 사용처 예시 |
|---|---|---|
| Azure | 정보, 진행 중인 측정 | KPI 메인 숫자 (토큰), 활성 사용자 차트 라인 |
| Amber | 비용 / 주의 | $ 금액, 5h 세션 한도 40–80% |
| Lime | 성공 / 정상 | 활성 사용자 카운트, 주간 한도 0–40% |
| Coral | 위험 / 실패 | 5h 세션 한도 ≥80%, 실패 세션, 에러 알림 |
| Violet | 구조적 측정 / 오늘 강조 | 누적 세션 수, 활동 히트맵 오늘 셀, 차트의 "현재 기간" 막대 |

다섯 번째 색 도입 금지. 새 의미가 필요하면 위 다섯 안에서 텍스트 weight + glyph 조합으로 해결.

## 5. 검증 체크리스트

작업 완료 후 아래를 모두 통과해야 한다:

- [ ] `pnpm tauri dev` 실행 시 1440×900 윈도우가 트레이 외부에 떠야 함 (popover 동작 X)
- [ ] 좌측 사이드바에 3개 네비 (내 대시보드 / 사내 대시보드 / 팀 채팅) + 사용자 블록 표시
- [ ] 각 페이지에서 카드들이 다크 인디고 캔버스 위에 surface-1 톤으로 떠 있고, 카드 상단 1px inner-highlight 가 보임
- [ ] 모든 숫자가 JetBrains Mono 로 렌더링됨 (탭/숫자 정렬이 깔끔)
- [ ] 사내 대시보드 리더보드의 헤더 클릭 시 정렬 토글, 팀 칩 클릭 시 필터, 검색 입력 동작
- [ ] 사이드바 하단 sun/moon 아이콘 클릭 시 라이트 테마 전환 + 페이지 reload 후에도 유지
- [ ] 한국어 짧은 라벨 (버튼·네비·필 등) 이 절대 줄바꿈되지 않음 (Korean CJK wrap 주의: `white-space: nowrap` 필수)
- [ ] Tauri 빌드 (`pnpm tauri build`) 가 경고 없이 성공

## 6. 컬러 / 토큰 매핑 빠른 참조 (구 → 신)

| 구 (HP) | 신 (Madup Console) |
|---|---|
| `--color-primary #024ad8` | `--color-azure #4DA3FF` |
| `--color-ink #1a1a1a` | `--color-text-primary #E7ECF7` (다크 모드 기준) |
| `--color-canvas #ffffff` | `--color-canvas #0B1126` |
| `--color-cloud #f7f7f7` | `--color-surface-1 #121A33` |
| `--color-fog #e8e8e8` | `--color-surface-2 #19233F` |
| `--color-hairline #e8e8e8` | `--color-hairline rgba(255,255,255,0.06)` |
| `--color-graphite #636363` | `--color-text-tertiary #6A7593` |
| `--color-bloom-coral #ff5050` | `--color-coral #FF6B5C` |
| 버튼 4px 라운드 | 8px (md) |
| 카드 16px 라운드 | 14px (xl) — 시그니처 카드 / 20px (xxl) — feature 카드 |

## 7. 작업 순서 제안

1. 의존성: `pnpm add @fontsource/jetbrains-mono` (또는 Google Fonts CDN)
2. `src-tauri/tauri.conf.json` 윈도우 설정 변경 + tray 동작 단순화
3. `src/index.css` 토큰 전면 재작성 + `mc-*` 유틸 추가 + `theme-light` 오버라이드
4. `index.html` `<head>` 에 FOUC 방지 인라인 스크립트
5. `Sidebar.tsx` + `TitleBar.tsx` + `ThemeToggle.tsx` 신규
6. `App.tsx` 레이아웃 교체 + 라우트 정리
7. `Dashboard.tsx` 카드들을 `mc-card` 와 `KpiCard` 로 재작성
8. `CompanyDashboard.tsx` 신규 (MCP/Plugin/Leaderboard 통합)
9. `Chat.tsx` 다크 톤 적용 + 4-column 레이아웃
10. `MCP.tsx`, `Plugins.tsx`, `Leaderboard.tsx` 삭제 + i18n 키 정리
11. `pnpm lint` + `pnpm tauri dev` 검증
12. 최종 `pnpm tauri build`

## 부록 — 자주 쓰는 클래스 빠른 참조

```tsx
// 카드 헤더 패턴
<header className="flex items-center justify-between mb-3.5 gap-3">
  <span className="mc-eyebrow">오늘 · DAILY</span>
  <span className="text-[11px] text-text-tertiary num">−75% vs 7d 평균</span>
</header>

// KPI numeral
<p className="num text-[48px] font-medium leading-none tracking-[-0.02em] text-azure">62M</p>
<span className="text-[13px] text-text-secondary">tokens · 62M cached</span>

// 상태 pill
<span className="inline-flex items-center gap-1.5 h-[22px] px-2.5 rounded-full
  bg-lime-soft text-lime text-[11px] font-medium whitespace-nowrap">
  <span className="w-1.5 h-1.5 rounded-full bg-lime shadow-[0_0_8px_var(--color-lime)]"/>
  OAuth 연결됨
</span>

// 12-세그먼트 한도 바 (signal-amber 56% = 6 fully + 1 dim)
<div className="flex gap-[3px] h-2.5">
  {Array.from({length: 12}).map((_, i) => (
    <div key={i} className={cn(
      "flex-1 rounded-[3px]",
      i < 6 ? "bg-amber shadow-[0_0_8px_rgba(245,181,68,0.45)]" :
      i === 6 ? "bg-amber/35" : "bg-surface-3"
    )}/>
  ))}
</div>
```

---

이 프롬프트와 함께 `DESIGN.md` 전체, 그리고 세 개의 mockup HTML 을 컨텍스트로 두고
실제 코드를 한 번에 갈아끼우면 된다. 단계별로 진행하고 각 단계마다 `pnpm tauri dev` 로 시각 확인하라.
