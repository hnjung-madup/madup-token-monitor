import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { startSlackLogin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { TitleBar } from "@/components/layout/TitleBar";

const IS_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);

  useEffect(() => {
    if (IS_TAURI) {
      getVersion()
        .then(setAppVersion)
        .catch(() => {});
    }
    // 사내 멤버 수 — Supabase RLS 가 anon 읽기를 허용하면 동적, 아니면 fallback.
    let cancelled = false;
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .then(({ count, error: err }) => {
        if (cancelled) return;
        if (err || count == null) return; // fallback to static text
        setMemberCount(count);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      await startSlackLogin();
      // openUrl 가 resolve 한 시점은 외부 브라우저에 OAuth URL 을 던진 직후일 뿐
      // 인증 완료가 아니라서 loading 해제. 인증 성공 시엔 deep-link 콜백이
      // 곧 도착해 App.tsx 의 DeepLinkBridge 가 navigate("/") 로 이 페이지를 unmount.
      setLoading(false);
    } catch {
      setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
      setLoading(false);
    }
  }

  return (
    <div className="grid h-screen grid-rows-[36px_28px_1fr_auto] overflow-hidden bg-canvas text-text-primary">
      {/* Title bar */}
      <TitleBar />

      {/* Utility strip */}
      <div className="flex items-center justify-between px-6 border-b border-hairline bg-[rgba(7,11,23,0.6)] text-[10.5px] font-bold tracking-[0.16em] uppercase text-text-tertiary whitespace-nowrap">
        <div className="inline-flex items-center gap-3.5">
          <span>MADUP</span>
          <Dot />
          <span>Internal Tool</span>
          <Dot />
          <span>KR</span>
          <Dot />
          <span className="num text-text-faint tracking-normal font-medium">
            v{appVersion ?? "0.0.0"}
          </span>
        </div>
        <div className="inline-flex items-center gap-2 text-amber tracking-normal text-[10.5px]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber shadow-[0_0_6px_var(--color-amber)] animate-[livepulse_1.8s_ease-in-out_infinite]" />
          <span>Authentication required</span>
        </div>
      </div>

      {/* Hero */}
      <div className="relative flex items-center justify-center p-6 overflow-hidden">
        {/* Ambient dot grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 55% at 50% 50%, black 30%, transparent 80%)",
            maskImage:
              "radial-gradient(ellipse 70% 55% at 50% 50%, black 30%, transparent 80%)",
          }}
        />

        {/* Floating chips */}
        <FloatingChip
          className="left-[calc(50%-380px)] top-[28%] -rotate-2"
          icon={<span className="text-[#06122B] font-extrabold text-[11px]">M</span>}
          iconBg="var(--color-azure)"
          title={memberCount != null ? `${memberCount} members` : "사내 멤버 전용"}
          subtitle="사내 워크스페이스"
        />
        <FloatingChip
          className="right-[calc(50%-380px)] top-[22%] rotate-3"
          icon={
            <svg
              width="11"
              height="11"
              viewBox="0 0 16 16"
              fill="none"
              stroke="#06170A"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M3 8l3.5 3.5L13 4.5" />
            </svg>
          }
          iconBg="var(--color-lime)"
          title="로컬 우선"
          subtitle="원시 데이터는 디바이스 외부로 X"
        />
        <FloatingChip
          className="left-[calc(50%-360px)] bottom-[28%] rotate-2"
          icon={
            <svg
              width="11"
              height="11"
              viewBox="0 0 16 16"
              fill="none"
              stroke="#06122B"
              strokeWidth="1.8"
            >
              <path d="M3 6l5-3 5 3v6l-5 3-5-3V6z" />
            </svg>
          }
          iconBg="var(--color-violet)"
          title="MCP · 플러그인"
          subtitle="사내 집계 자동 공유"
        />
        <FloatingChip
          className="right-[calc(50%-360px)] bottom-[24%] -rotate-3"
          icon={<span className="text-[#1a1206] font-extrabold text-[11px]">$</span>}
          iconBg="var(--color-amber)"
          title="실시간 비용 추적"
          subtitle="5h 세션 · 주간 한도"
        />

        {/* Login card */}
        <section
          className="relative w-[480px] rounded-[20px] border border-hairline overflow-hidden"
          style={{
            background: "var(--color-surface-1)",
            padding: "44px 44px 36px",
            boxShadow:
              "0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(77,163,255,0.06)",
          }}
        >
          {/* Inner-highlight (top 50%) */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[20px]"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)",
            }}
          />
          {/* Gradient frame */}
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-[21px]"
            style={{
              background:
                "linear-gradient(135deg, rgba(77,163,255,0.4), transparent 30%, transparent 70%, rgba(182,140,255,0.3))",
              padding: "1px",
              WebkitMask:
                "linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)",
              WebkitMaskComposite: "xor",
              mask: "linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)",
              maskComposite: "exclude",
            }}
          />

          {/* Brand glyph */}
          <div
            className="relative mb-6 flex items-center justify-center font-extrabold text-white text-[24px] tracking-tight"
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background:
                "linear-gradient(135deg, var(--color-azure-bright) 0%, var(--color-azure-deep) 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.3), 0 0 0 1px rgba(77,163,255,0.4), 0 12px 24px rgba(77,163,255,0.3)",
            }}
          >
            M
            <span
              aria-hidden
              className="absolute -inset-2 rounded-[20px] border border-[rgba(77,163,255,0.15)] animate-[ring_2.4s_ease-in-out_infinite]"
            />
          </div>

          <p className="mb-3.5 text-[11px] font-bold tracking-[0.18em] uppercase text-azure">
            MADUP MEMBERS ONLY
          </p>

          <h1 className="mb-3.5 text-[36px] font-bold leading-[1.1] tracking-[-0.02em] text-text-primary">
            매드업
            <br />
            <span className="bg-gradient-to-r from-azure-bright to-violet bg-clip-text text-transparent">
              토큰 콘솔
            </span>
            에 로그인
          </h1>

          <p className="mb-7 text-[14px] leading-[1.55] text-text-secondary">
            <span className="num font-medium text-azure-bright">@madup.com</span>{" "}
            계정으로 Slack 인증 후 팀 채팅과 사내 집계 기능을 이용하세요. 외부
            브라우저가 열리면 인증을 마치고 자동으로 이 창으로 돌아옵니다.
          </p>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="relative w-full h-[52px] rounded-[12px] overflow-hidden flex items-center justify-center gap-3 font-bold text-[14.5px] tracking-[0.05em] uppercase transition-all disabled:cursor-wait disabled:opacity-80"
            style={{
              background: "var(--color-azure)",
              color: "var(--color-text-on-accent)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 20px rgba(77,163,255,0.25)",
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%)",
              }}
            />
            {loading ? (
              <>
                <Spinner />
                로그인 중...
              </>
            ) : (
              <>
                <SlackMark />
                Slack으로 로그인
              </>
            )}
          </button>

          {error && (
            <p className="mt-4 text-[12px] text-coral text-center">{error}</p>
          )}

          <div className="my-5 flex items-center gap-3">
            <span className="flex-1 h-px bg-hairline" />
            <span className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-text-faint">
              Privacy
            </span>
            <span className="flex-1 h-px bg-hairline" />
          </div>

          <div
            className="flex gap-2.5 items-start p-3 rounded-[10px] border border-hairline"
            style={{ background: "var(--color-surface-2)" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 mt-0.5 text-lime"
            >
              <path d="M8 1l6 3v4a8 8 0 01-6 8 8 8 0 01-6-8V4l6-3z" />
              <path d="M5.5 8l2 2 3-4" />
            </svg>
            <p className="text-[12px] leading-[1.55] text-text-tertiary">
              <strong className="font-semibold text-text-secondary">
                로컬 우선 (Local-first)
              </strong>{" "}
              · 원시 토큰 로그·프롬프트·대화 내용은 이 디바이스를 떠나지 않습니다.
              사내 집계는{" "}
              <strong className="font-semibold text-text-secondary">
                모니터링 목적으로 공유
              </strong>
              되며, 토큰/비용 합계만 전송됩니다.
            </p>
          </div>
        </section>
      </div>

      {/* Footer band */}
      <div
        className="flex items-center justify-between px-7 py-3.5 border-t border-hairline whitespace-nowrap text-[10.5px] font-semibold tracking-[0.14em] uppercase text-text-tertiary"
        style={{ background: "rgba(7,11,23,0.7)" }}
      >
        <div className="inline-flex items-center gap-3">
          <span>© Madup</span>
          <Dot />
          <span className="text-text-primary">Token Monitor</span>
          <Dot />
          <span className="text-text-faint font-medium tracking-[0.14em]">
            Local-first · Aggregates shared for monitoring
          </span>
        </div>
        <div className="inline-flex items-center gap-3.5 text-text-faint normal-case tracking-normal text-[10px] font-normal">
          <span>도움말</span>
          <KeyChip>⌘ ?</KeyChip>
          <span>개발자 모드</span>
          <KeyChip>⌘ ⇧ D</KeyChip>
        </div>
      </div>

      {/* Local keyframes — needed only here for the brand glyph ring + livepulse */}
      <style>{`
        @keyframes ring {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.05); opacity: 0.1; }
        }
        @keyframes livepulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}

function Dot() {
  return <span className="w-[3px] h-[3px] bg-text-faint rounded-full" />;
}

function FloatingChip({
  className,
  icon,
  iconBg,
  title,
  subtitle,
}: {
  className?: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      className={`absolute z-[1] flex items-center gap-2 px-3 py-2.5 rounded-[10px] border border-hairline ${className ?? ""}`}
      style={{
        background: "rgba(18,26,51,0.85)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
    >
      <span
        className="shrink-0 w-[22px] h-[22px] rounded-md flex items-center justify-center"
        style={{ background: iconBg }}
      >
        {icon}
      </span>
      <div>
        <div className="num text-[11px] font-semibold text-text-primary leading-tight">
          {title}
        </div>
        <div className="text-[11px] text-text-tertiary leading-tight mt-0.5">
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function KeyChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="num inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-hairline text-text-tertiary"
      style={{ background: "var(--color-surface-2)" }}
    >
      {children}
    </span>
  );
}

function SlackMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 122 122" fill="none">
      <path d="M25.2 77.5a12.6 12.6 0 1 1-12.6-12.6h12.6v12.6z" fill="#E01E5A" />
      <path
        d="M31.6 77.5a12.6 12.6 0 1 1 25.2 0v31.6a12.6 12.6 0 1 1-25.2 0V77.5z"
        fill="#E01E5A"
      />
      <path d="M44.2 25.2a12.6 12.6 0 1 1 12.6-12.6v12.6H44.2z" fill="#36C5F0" />
      <path
        d="M44.2 31.6a12.6 12.6 0 1 1 0 25.2H12.6a12.6 12.6 0 1 1 0-25.2h31.6z"
        fill="#36C5F0"
      />
      <path d="M96.4 44.2a12.6 12.6 0 1 1 12.6 12.6H96.4V44.2z" fill="#2EB67D" />
      <path
        d="M90 44.2a12.6 12.6 0 1 1-25.2 0V12.6a12.6 12.6 0 1 1 25.2 0v31.6z"
        fill="#2EB67D"
      />
      <path d="M77.5 96.4A12.6 12.6 0 1 1 64.9 109v-12.6h12.6z" fill="#ECB22E" />
      <path
        d="M77.5 90a12.6 12.6 0 1 1 0-25.2h31.6a12.6 12.6 0 1 1 0 25.2H77.5z"
        fill="#ECB22E"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-30"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
      />
    </svg>
  );
}
