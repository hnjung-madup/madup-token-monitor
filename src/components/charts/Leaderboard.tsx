import { useMemo, useState } from "react";
import type { CompanyLeaderboardEntry } from "@/hooks/useUsage";
import { formatTokensCompact, formatUSD } from "@/lib/format";
import { SearchInput } from "@/components/ui/SearchInput";

type SortKey = "rank" | "name" | "tokens" | "cost";
type SortDir = "asc" | "desc";

interface LeaderboardProps {
  rows: CompanyLeaderboardEntry[];
  /// 본인 인증 사용자의 email (또는 display_name) — 'ME' 행 강조용.
  meIdentifier?: string | null;
  /// 우상단 푸터 컨텍스트 ("16명 중 10명 옵트인" 같은)
  footerContext?: string;
  isLoading?: boolean;
}

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

function rankClass(rank: number): string {
  if (rank === 1)
    return "bg-gradient-to-br from-[#f5d36b] to-[#d49b1b] text-[#3a2607] shadow-[0_0_12px_rgba(245,181,68,0.4)]";
  if (rank === 2)
    return "bg-gradient-to-br from-[#cfd6e6] to-[#8593af] text-[#1b223a]";
  if (rank === 3)
    return "bg-gradient-to-br from-[#d99878] to-[#a26041] text-[#2a160a]";
  return "bg-surface-2 text-text-secondary";
}

export function Leaderboard({
  rows,
  meIdentifier,
  footerContext,
  isLoading,
}: LeaderboardProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = rows.filter((r) =>
        r.display_name.toLowerCase().includes(q),
      );
    }
    const sorted = out.slice().sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (sortKey === "name") {
        av = a.display_name.toLowerCase();
        bv = b.display_name.toLowerCase();
      } else if (sortKey === "tokens") {
        av = a.total_tokens;
        bv = b.total_tokens;
      } else if (sortKey === "cost") {
        av = a.total_cost;
        bv = b.total_cost;
      } else {
        av = a.rank;
        bv = b.rank;
      }
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return sorted;
  }, [rows, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "rank" ? "asc" : "desc");
    }
  }

  function handleReset() {
    setQuery("");
    setSortKey("rank");
    setSortDir("asc");
  }

  const maxTokens = Math.max(...filtered.map((r) => r.total_tokens), 1);

  // Footer totals
  const totals = filtered.reduce(
    (acc, r) => {
      acc.tokens += r.total_tokens;
      acc.cost += r.total_cost;
      return acc;
    },
    { tokens: 0, cost: 0 },
  );

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 pb-3 mb-2 border-b border-hairline">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-hairline bg-surface-2 text-text-secondary text-[11.5px] font-medium hover:text-text-primary hover:border-hairline-strong transition-colors"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M2 8a6 6 0 0110.3-4.2L14 2v4h-4" />
          </svg>
          초기화
        </button>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="이름 검색…"
          className="ml-auto flex-[0_1_220px]"
        />
      </div>

      {/* Table */}
      <div className="flex flex-col">
        {/* Header row */}
        <div className="grid grid-cols-[28px_1fr_1fr_90px] gap-3 px-2.5 py-1.5 items-center">
          <SortHeader
            label="#"
            active={sortKey === "rank"}
            dir={sortDir}
            onClick={() => toggleSort("rank")}
          />
          <SortHeader
            label="USER"
            active={sortKey === "name"}
            dir={sortDir}
            onClick={() => toggleSort("name")}
          />
          <SortHeader
            label="TOKENS"
            active={sortKey === "tokens"}
            dir={sortDir}
            onClick={() => toggleSort("tokens")}
          />
          <SortHeader
            label="USD"
            align="right"
            active={sortKey === "cost"}
            dir={sortDir}
            onClick={() => toggleSort("cost")}
          />
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-text-tertiary text-[12.5px]">
            불러오는 중…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-text-tertiary text-[12.5px]">
            결과가 없어요. 다른 검색어를 시도해 보세요.
          </div>
        ) : (
          filtered.map((r, idx) => {
            const isMe =
              !!meIdentifier &&
              r.display_name.toLowerCase().includes(meIdentifier.toLowerCase());
            const ratio = r.total_tokens / maxTokens;
            return (
              <div
                key={`${r.display_name}-${r.rank}`}
                className={`grid grid-cols-[28px_1fr_1fr_90px] gap-3 px-2.5 py-2.5 items-center ${
                  idx > 0 ? "border-t border-hairline" : ""
                } ${isMe ? "bg-azure-soft border-t-transparent rounded-md" : ""}`}
              >
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full num text-[12px] font-semibold ${
                    isMe
                      ? "bg-azure text-text-on-accent"
                      : rankClass(r.rank)
                  }`}
                >
                  {r.rank}
                </div>

                <div className="flex items-center gap-2.5 min-w-0">
                  {r.avatar_url ? (
                    <img
                      src={r.avatar_url}
                      alt={r.display_name}
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--color-azure), var(--color-violet))",
                        color: "#06122b",
                      }}
                    >
                      {initials(r.display_name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-[12.5px] text-text-primary font-medium truncate">
                      {r.display_name}
                      {isMe && (
                        <span
                          className="ml-1.5 inline-flex items-center text-[9.5px] font-bold uppercase tracking-[0.05em] px-1.5 py-0.5 rounded"
                          style={{
                            background: "var(--color-azure)",
                            color: "var(--color-text-on-accent)",
                          }}
                        >
                          나
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex-1 min-w-[60px] h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(2, ratio * 100)}%`,
                        background:
                          "linear-gradient(90deg, var(--color-azure-deep), var(--color-azure))",
                      }}
                    />
                  </div>
                  <span className="num text-[12.5px] text-azure font-medium whitespace-nowrap shrink-0">
                    {formatTokensCompact(r.total_tokens)}
                  </span>
                </div>

                <span className="num text-[12px] text-amber font-medium text-right whitespace-nowrap">
                  {formatUSD(r.total_cost)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-3.5 pt-3 border-t border-hairline text-[11px] text-text-tertiary">
        <span>
          <strong className="num text-text-secondary font-semibold">
            {formatTokensCompact(totals.tokens)}
          </strong>{" "}
          tokens ·{" "}
          <strong className="num text-text-secondary font-semibold">
            {formatUSD(totals.cost)}
          </strong>
        </span>
        {footerContext && <span>{footerContext}</span>}
      </div>
    </div>
  );
}

interface SortHeaderProps {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}
function SortHeader({ label, active, dir, onClick, align = "left" }: SortHeaderProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 cursor-pointer select-none text-[10px] font-bold tracking-[0.14em] uppercase transition-colors ${
        align === "right" ? "justify-end" : ""
      } ${active ? "text-azure-bright" : "text-text-faint hover:text-text-secondary"}`}
    >
      {label}
      <span
        className="inline-block transition-all"
        style={{
          opacity: active ? 1 : 0,
          width: 0,
          height: 0,
          borderLeft: "3.5px solid transparent",
          borderRight: "3.5px solid transparent",
          borderTop: "4.5px solid currentColor",
          transform: active && dir === "asc" ? "rotate(180deg)" : "rotate(0deg)",
          marginLeft: 2,
        }}
      />
    </button>
  );
}
