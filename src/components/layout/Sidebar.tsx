import type { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthUser } from "@/hooks/useAuthUser";
import { signOut } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface NavItemDef {
  to: string;
  end?: boolean;
  labelKey: string;
  group: "personal" | "team";
  icon: ReactNode;
}

const NAV_ITEMS: NavItemDef[] = [
  {
    to: "/",
    end: true,
    labelKey: "nav.dashboard",
    group: "personal",
    icon: (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="2" y="2" width="5" height="6" rx="1.2" />
        <rect x="9" y="2" width="5" height="4" rx="1.2" />
        <rect x="2" y="10" width="5" height="4" rx="1.2" />
        <rect x="9" y="8" width="5" height="6" rx="1.2" />
      </svg>
    ),
  },
  {
    to: "/team",
    labelKey: "nav.team",
    group: "team",
    icon: (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M2 14V9a2 2 0 012-2h2a2 2 0 012 2v5" />
        <path d="M8 14V6a2 2 0 012-2h2a2 2 0 012 2v8" />
        <path d="M1 14h14" />
      </svg>
    ),
  },
];

function initials(text: string | undefined | null) {
  if (!text) return "?";
  const trimmed = text.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

export function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const location = useLocation();
  const settingsActive = location.pathname.startsWith("/settings");

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <aside
      className="w-56 shrink-0 flex flex-col gap-5 border-r border-hairline px-3 py-5 bg-[rgba(7,11,23,0.55)]"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 pb-2">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-white font-extrabold text-[13px] tracking-tight"
          style={{
            background:
              "linear-gradient(135deg, var(--color-azure-bright) 0%, var(--color-azure-deep) 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 14px rgba(77,163,255,0.35)",
          }}
        >
          M
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-[13px] text-text-primary tracking-[0.04em]">
            MADUP
          </span>
          <span className="text-[10px] text-text-tertiary tracking-[0.18em] uppercase mt-0.5">
            Token Console
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        <div className="text-[10.5px] font-bold tracking-[0.16em] uppercase text-text-faint px-3 pt-1 pb-2 whitespace-nowrap">
          Personal
        </div>
        {NAV_ITEMS.filter((i) => i.group === "personal").map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `mc-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="w-4 h-4 shrink-0 text-text-tertiary [.active_&]:text-azure">
              {item.icon}
            </span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {t(item.labelKey)}
            </span>
          </NavLink>
        ))}

        <div className="text-[10.5px] font-bold tracking-[0.16em] uppercase text-text-faint px-3 pt-3.5 pb-2 whitespace-nowrap">
          Team
        </div>
        {NAV_ITEMS.filter((i) => i.group === "team").map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `mc-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="w-4 h-4 shrink-0 text-text-tertiary [.active_&]:text-azure">
              {item.icon}
            </span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {t(item.labelKey)}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />

      <div className="h-px bg-hairline mx-1" />

      {/* User block */}
      {user ? (
        <div className="grid grid-cols-[32px_1fr_auto] gap-2.5 items-center p-2 rounded-lg bg-surface-1 border border-hairline">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name ?? user.email}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold"
              style={{
                background:
                  "linear-gradient(135deg, #4da3ff 0%, #b68cff 100%)",
                color: "#06122b",
              }}
            >
              {initials(user.name ?? user.email)}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-text-primary leading-tight truncate">
              {user.name ?? user.email}
            </div>
            <div className="text-[11px] text-text-tertiary leading-tight mt-0.5 truncate">
              {user.email}
            </div>
          </div>
          <div className="flex gap-0.5">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => navigate("/settings")}
              aria-label="설정"
              title="설정"
              className={`mc-icon-btn ${settingsActive ? "bg-azure-soft text-azure-bright" : ""}`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              >
                <circle cx="8" cy="8" r="2" />
                <path d="M8 1v2M8 13v2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M1 8h2M13 8h2M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="로그아웃"
              title="로그아웃"
              className="mc-icon-btn"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 3H3v10h3M10 5l3 3-3 3M13 8H6" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-1 border border-hairline">
          <div className="text-[11px] text-text-tertiary truncate">
            로그인 필요
          </div>
          <ThemeToggle />
        </div>
      )}
    </aside>
  );
}
