import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useTranslation } from "react-i18next";
import { onOpenUrl, getCurrent } from "@tauri-apps/plugin-deep-link";
import "@/i18n/index";
import { Dashboard } from "@/pages/Dashboard";
import MCP from "@/pages/MCP";
import Plugins from "@/pages/Plugins";
import Leaderboard from "@/pages/Leaderboard";
import Chat from "@/pages/Chat";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";
import { AuthGuard } from "@/lib/AuthGuard";
import { handleAuthCallback, syncAggregatesNow } from "@/lib/auth";
import { supabase, getProfile } from "@/lib/supabase";
import { signOut } from "@/lib/supabase";
import { useAuthUser } from "@/hooks/useAuthUser";

// 캐시를 localStorage에 영속화 — 앱 재시작 시 옛 데이터를 즉시 표시하고 백그라운드 refetch.
// MCP / 사용량 페이지가 cold start에 즉시 보이도록 하는 핵심.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24h: persist 대상이 되려면 gcTime이 충분히 길어야 함
      staleTime: 1000 * 30,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "madup-token-monitor:rq",
});

const NAV_ITEMS = [
  { path: "/", label: "nav.dashboard" },
  { path: "/mcp", label: "nav.mcp" },
  { path: "/plugins", label: "nav.plugins" },
  { path: "/leaderboard", label: "nav.leaderboard" },
  { path: "/chat", label: "nav.chat" },
  { path: "/settings", label: "nav.settings" },
] as const;

function MadupMark({ size = 28 }: { size?: number }) {
  return (
    <img
      src="/madup-favicon.png"
      alt="Madup"
      width={size}
      height={size}
      className="shrink-0"
    />
  );
}

// 메뉴바 popover — 상단의 좁은 헤더가 드래그 영역 + 로고 + 액션 아이콘.
// 클릭 가능 자식에는 data-tauri-drag-region을 두지 않아 드래그가 발동하지 않음.
function PopoverHeader() {
  const { user } = useAuthUser();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <header
      data-tauri-drag-region
      style={{ cursor: "grab" }}
      className="flex items-center justify-between px-3 py-2 border-b border-hairline bg-canvas select-none"
    >
      <div data-tauri-drag-region className="flex items-center gap-2 min-w-0">
        <MadupMark size={22} />
        <div data-tauri-drag-region className="leading-tight min-w-0">
          <p data-tauri-drag-region className="text-[12px] font-semibold text-ink truncate">
            매드업 토큰 모니터
          </p>
          <p data-tauri-drag-region className="text-[10px] text-graphite truncate">
            {user?.email ?? "로그인 필요"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => navigate("/settings")}
          title="설정"
          className="w-7 h-7 rounded-md hover:bg-cloud transition-colors flex items-center justify-center text-graphite hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d="M13.5 8c0-.4-.04-.78-.12-1.16l1.4-1.07-1.5-2.6-1.66.62a5.5 5.5 0 00-2.02-1.16L9.3 1H6.7l-.3 1.63a5.5 5.5 0 00-2.02 1.16l-1.66-.62-1.5 2.6 1.4 1.07A5.6 5.6 0 002.5 8c0 .4.04.78.12 1.16l-1.4 1.07 1.5 2.6 1.66-.62a5.5 5.5 0 002.02 1.16L6.7 15h2.6l.3-1.63a5.5 5.5 0 002.02-1.16l1.66.62 1.5-2.6-1.4-1.07c.08-.38.12-.76.12-1.16z"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {user && (
          <button
            onClick={handleSignOut}
            title="로그아웃"
            className="w-7 h-7 rounded-md hover:bg-cloud transition-colors flex items-center justify-center text-graphite hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 3H3v10h3M10 5l3 3-3 3M13 8H6"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}

function TabBar() {
  const { t } = useTranslation();
  return (
    <nav className="flex border-b border-hairline bg-canvas">
      {NAV_ITEMS.filter((item) => item.path !== "/settings").map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === "/"}
          className={({ isActive }) =>
            `flex-1 text-center py-2 text-[12px] font-semibold transition-colors relative ${
              isActive
                ? "text-ink"
                : "text-graphite hover:text-ink"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span>{t(item.label)}</span>
              {isActive && (
                <span className="absolute left-3 right-3 bottom-0 h-[2px] bg-primary rounded-full" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function Layout() {
  return (
    <AuthGuard>
      <div className="flex flex-col h-screen overflow-hidden bg-canvas">
        <PopoverHeader />
        <TabBar />
        <main className="flex-1 overflow-y-auto bg-cloud">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/mcp" element={<MCP />} />
            <Route path="/plugins" element={<Plugins />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </AuthGuard>
  );
}

/// share_consent=true 인 경우 1시간마다 사내 집계 sync. 로그인되어 있어야 호출됨.
/// 본인 데이터만 본인 access_token으로 업로드 (RLS WITH CHECK가 보장).
function AggregateSyncDriver() {
  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    async function runOnce() {
      if (cancelled) return;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;
        if (!userId) return;
        const profile = await getProfile(userId);
        if (!profile?.share_consent) return;
        await syncAggregatesNow();
      } catch (e) {
        console.warn("[aggregate-sync] failed:", e);
      }
    }

    // 시작 후 5초 뒤 첫 sync (cold start 충돌 회피), 이후 60분마다.
    const initial = setTimeout(runOnce, 5_000);
    interval = setInterval(runOnce, 60 * 60 * 1000);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      if (interval) clearInterval(interval);
    };
  }, []);
  return null;
}

function DeepLinkBridge() {
  const navigate = useNavigate();
  // navigate 는 react-router context 가 바뀔 때마다 새 ref 가 될 수 있음.
  // useEffect 의 dep 으로 두면 location 변경마다 재실행되어 getCurrent() 가
  // 같은 OAuth URL 을 반복 처리, 사용자가 탭을 이동할 때마다 navigate("/") 로
  // 끌려가는 버그가 발생. ref 로 우회하고 deps 는 비워 mount 시 1회만 등록.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const processed = new Set<string>();

    async function processUrl(url: string | null | undefined) {
      if (!url || !url.startsWith("madup-token-monitor://auth/callback")) return;
      if (processed.has(url)) return;
      processed.add(url);
      const ok = await handleAuthCallback(url);
      if (ok) navigateRef.current("/", { replace: true });
    }

    getCurrent()
      .then((urls) => processUrl(urls?.[0]))
      .catch(() => {});

    onOpenUrl((urls) => processUrl(urls?.[0]))
      .then((u) => {
        unlisten = u;
      })
      .catch(() => {});

    return () => unlisten?.();
  }, []);
  return null;
}

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
    >
      <BrowserRouter>
        <DeepLinkBridge />
        <AggregateSyncDriver />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<Layout />} />
        </Routes>
      </BrowserRouter>
    </PersistQueryClientProvider>
  );
}
