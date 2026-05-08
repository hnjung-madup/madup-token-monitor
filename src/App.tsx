import { useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
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

// [ROUTING MARKER] W3: Dashboard, MCP 페이지 라우트는 이미 등록됨
// [ROUTING MARKER] W4: Login, Profile 라우트 추가됨
// [ROUTING MARKER] W5: 채팅 라우트 이미 등록됨

const queryClient = new QueryClient();

const NAV_ITEMS = [
  { path: "/", label: "nav.dashboard", icon: "📊" },
  { path: "/mcp", label: "nav.mcp", icon: "🔌" },
  { path: "/leaderboard", label: "nav.leaderboard", icon: "🏆" },
  { path: "/chat", label: "nav.chat", icon: "💬" },
  { path: "/settings", label: "nav.settings", icon: "⚙️" },
] as const;

function Sidebar() {
  const { t } = useTranslation();
  return (
    <aside className="w-56 shrink-0 border-r bg-sidebar flex flex-col h-screen">
      <div className="px-4 py-5 font-bold text-base tracking-tight border-b">
        매드업 토큰 모니터
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60"
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{t(item.label)}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function Layout() {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background">
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
    </AuthGuard>
  );
}

function DeepLinkBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    onOpenUrl(async (urls) => {
      const url = urls?.[0];
      if (!url || !url.startsWith("madup-token-monitor://auth/callback")) return;
      const ok = await handleAuthCallback(url);
      if (ok) navigate("/", { replace: true });
    })
      .then((u) => {
        unlisten = u;
      })
      .catch(() => {
        // dev 모드에서 deep-link 미등록 가능 — 빌드 후 정식 동작
      });
    return () => unlisten?.();
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DeepLinkBridge />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<Layout />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
