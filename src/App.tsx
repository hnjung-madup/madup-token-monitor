import { useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useTranslation } from "react-i18next";
import { onOpenUrl, getCurrent } from "@tauri-apps/plugin-deep-link";
import "@/i18n/index";
import { Dashboard } from "@/pages/Dashboard";
import MCP from "@/pages/MCP";
import Leaderboard from "@/pages/Leaderboard";
import Chat from "@/pages/Chat";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";
import { AuthGuard } from "@/lib/AuthGuard";
import { handleAuthCallback } from "@/lib/auth";
import { signOut } from "@/lib/supabase";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Avatar } from "@/components/Avatar";

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

function UtilityStrip() {
  const navigate = useNavigate();
  const { user } = useAuthUser();

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="hp-utility-strip flex items-center justify-between">
      <span className="tracking-[0.16em] uppercase font-bold text-[11px]">
        Madup · Internal Tool · KR
      </span>
      <div className="flex items-center gap-5 text-[12px]">
        <span className="hidden md:inline text-steel">For Madup Members</span>
        {user ? (
          <>
            <div className="flex items-center gap-2">
              <Avatar
                src={user.avatarUrl}
                name={user.name}
                size={22}
                className="ring-1 ring-on-ink/20"
              />
              <span className="text-on-ink/85">{user.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="uppercase tracking-[0.12em] font-semibold hover:text-primary-bright transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <span className="text-steel">Not signed in</span>
        )}
      </div>
    </div>
  );
}

function Sidebar() {
  const { t } = useTranslation();
  return (
    <aside className="w-60 shrink-0 border-r border-hairline bg-canvas flex flex-col">
      <div className="px-6 pt-7 pb-6 border-b border-hairline">
        <div className="flex items-center gap-2.5">
          <MadupMark size={32} />
          <div>
            <p className="hp-display-xs leading-none text-ink">madup</p>
            <p className="text-[10px] tracking-[0.18em] uppercase font-bold text-graphite mt-1">
              Token Monitor
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 flex flex-col gap-0.5">
        <p className="px-3 mb-2 text-[10px] tracking-[0.18em] uppercase font-bold text-graphite">
          Workspace
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `relative flex items-center px-3 py-2.5 text-[14px] font-medium transition-colors rounded-md ${
                isActive
                  ? "text-ink bg-cloud"
                  : "text-charcoal hover:text-ink hover:bg-cloud/60"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-primary rounded-full" />
                )}
                <span className="ml-1">{t(item.label)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-hairline">
        <p className="text-[11px] text-graphite leading-relaxed">
          v0.1.0 · 로컬 데이터는<br />이 디바이스에만 저장됩니다.
        </p>
      </div>
    </aside>
  );
}

function Layout() {
  return (
    <AuthGuard>
      <div className="flex flex-col h-screen overflow-hidden bg-canvas">
        <UtilityStrip />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-cloud">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/mcp" element={<MCP />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/profile" element={<Profile />} />
            </Routes>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

function DeepLinkBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function processUrl(url: string | null | undefined) {
      if (!url || !url.startsWith("madup-token-monitor://auth/callback")) return;
      const ok = await handleAuthCallback(url);
      if (ok) navigate("/", { replace: true });
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
  }, [navigate]);
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
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<Layout />} />
        </Routes>
      </BrowserRouter>
    </PersistQueryClientProvider>
  );
}
