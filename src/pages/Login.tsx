import { useEffect, useState } from "react";
import { startSlackLogin } from "@/lib/auth";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      await startSlackLogin();
    } catch {
      setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* Utility strip */}
      <div className="hp-utility-strip flex items-center justify-between">
        <span className="tracking-[0.16em] uppercase font-bold text-[11px]">
          Madup · Internal Tool · KR
        </span>
        <span className="text-[12px] text-steel">Authentication required</span>
      </div>

      {/* Hero band */}
      <main className="flex-1 flex items-center justify-center px-6 py-16 overflow-hidden relative">
        {/* Chevron decorations on the page edges */}
        <div
          aria-hidden
          className="hidden md:block absolute -left-24 top-1/2 -translate-y-1/2 w-48 h-[420px] hp-chevron opacity-95"
        />
        <div
          aria-hidden
          className="hidden md:block absolute left-12 top-1/2 -translate-y-1/2 w-12 h-[420px] hp-chevron opacity-60"
        />
        <div
          aria-hidden
          className="hidden md:block absolute -right-24 top-1/2 -translate-y-1/2 w-48 h-[420px] hp-chevron opacity-95"
        />
        <div
          aria-hidden
          className="hidden md:block absolute right-12 top-1/2 -translate-y-1/2 w-12 h-[420px] hp-chevron opacity-60"
        />

        <section className="relative z-10 w-full max-w-md hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-10">
          <img
            src="/madup-favicon.png"
            alt="Madup"
            width={48}
            height={48}
            className="mb-6"
          />
          <p className="hp-eyebrow mb-4">Madup Members Only</p>
          <h1 className="hp-display-lg text-ink mb-3 leading-none">
            매드업<br />토큰 모니터
          </h1>
          <p className="hp-body text-charcoal mb-8">
            <span className="font-semibold text-ink">@madup.com</span> 계정으로
            Slack 인증 후 팀 채팅과 사내 집계 기능을 이용하세요.
          </p>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="hp-btn-primary w-full"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                  />
                </svg>
                로그인 중...
              </>
            ) : (
              <>
                <SlackIcon />
                Sign in with Slack
              </>
            )}
          </button>

          {error && (
            <p className="mt-4 hp-caption text-bloom-deep text-center">{error}</p>
          )}

          <div className="mt-8 pt-6 border-t border-hairline">
            <p className="hp-caption-sm text-graphite leading-relaxed">
              외부 브라우저가 열리면 Slack 계정으로 인증한 뒤 자동으로 앱으로
              돌아옵니다. 원시 토큰 데이터는 이 디바이스를 떠나지 않습니다.
            </p>
          </div>

          <DebugPanel />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-ink text-on-ink px-10 py-6">
        <div className="max-w-[1366px] mx-auto flex items-center justify-between">
          <p className="text-[11px] tracking-[0.18em] uppercase font-bold text-on-ink/70">
            © Madup · Token Monitor
          </p>
          <p className="hp-caption-sm text-on-ink/60">
            Local-first · Aggregation is opt-in
          </p>
        </div>
      </footer>
    </div>
  );
}

function DebugPanel() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 500);
    return () => clearInterval(t);
  }, []);
  const entries = Object.entries(localStorage)
    .filter(([k]) => k.startsWith("madup_debug_"))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k.replace("madup_debug_", "")}: ${v}`);
  if (entries.length === 0) return null;
  return (
    <pre
      data-tick={tick}
      style={{
        marginTop: 16,
        padding: 8,
        background: "#fafafa",
        border: "1px solid #e5e5e5",
        borderRadius: 4,
        fontSize: 9,
        lineHeight: 1.4,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        opacity: 0.7,
      }}
    >
      {entries.join("\n")}
    </pre>
  );
}

function SlackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  );
}
