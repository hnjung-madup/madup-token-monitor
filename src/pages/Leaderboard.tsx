import { useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Avatar } from "@/components/Avatar";
import { formatUSD, formatTokens } from "@/lib/format";
import {
  useCompanyLeaderboard,
  type CompanyLeaderboardEntry,
  type LeaderboardRange,
} from "@/hooks/useUsage";

const TABS: { id: LeaderboardRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
];

function MedalIcon({ rank }: { rank: 1 | 2 | 3 }) {
  const palette = {
    1: { bg: "#f5b324", ring: "#c98414", ribbon: "#b3262b" },
    2: { bg: "#c2c2c2", ring: "#8e8e8e", ribbon: "#356373" },
    3: { bg: "#cd7f32", ring: "#8a5320", ribbon: "#5a1313" },
  }[rank];

  return (
    <svg
      width={22}
      height={26}
      viewBox="0 0 28 32"
      aria-label={`${rank}위`}
      className="shrink-0"
    >
      <path d="M5 2 L11 14 L17 14 L23 2 Z" fill={palette.ribbon} />
      <circle cx="14" cy="20" r="10" fill={palette.bg} stroke={palette.ring} strokeWidth="1.5" />
      <text
        x="14"
        y="24"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#1a1a1a"
        fontFamily="Pretendard, system-ui, sans-serif"
      >
        {rank}
      </text>
    </svg>
  );
}

function RankCell({ rank }: { rank: number }) {
  if (rank <= 3) return <MedalIcon rank={rank as 1 | 2 | 3} />;
  return (
    <span className="text-[13px] text-graphite font-semibold w-6 text-center">
      {rank}
    </span>
  );
}

function Row({ entry, isMine }: { entry: CompanyLeaderboardEntry; isMine: boolean }) {
  return (
    <div
      className={`grid grid-cols-[28px_36px_1fr_auto] items-center gap-2 px-2 py-2 rounded-md ${
        isMine ? "bg-primary-soft/40" : "hover:bg-cloud"
      } transition-colors`}
    >
      <div className="flex items-center justify-center">
        <RankCell rank={entry.rank} />
      </div>
      <Avatar
        src={entry.avatar_url}
        name={entry.display_name}
        size={32}
        rounded="full"
      />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink truncate flex items-center gap-1.5">
          {entry.display_name}
          {isMine && (
            <span className="text-[9px] font-bold tracking-[0.14em] uppercase text-primary px-1 py-0.5 rounded bg-primary-soft">
              나
            </span>
          )}
        </p>
        <p className="text-[10px] text-graphite mt-0.5">
          {formatUSD(entry.total_cost)}
        </p>
      </div>
      <div className="text-right tabular-nums">
        <p className="text-[13px] font-bold text-primary leading-none">
          {formatTokens(entry.total_tokens)}
        </p>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const [range, setRange] = useState<LeaderboardRange>("week");
  const { user } = useAuthUser();
  const { data, error, isLoading, isFetching, refetch } = useCompanyLeaderboard(range);
  const errorMessage = error?.message ?? null;
  const isMissingFunction =
    !!errorMessage && /function .*get_top_users/i.test(errorMessage);

  const myHandle = user?.slackHandle ?? (user?.email ? user.email.split("@")[0] : null);
  const myName = user?.name ?? null;
  const isMineEntry = (entry: CompanyLeaderboardEntry) =>
    !!myHandle && (entry.display_name === myHandle || entry.display_name === myName);

  const entries = data ?? [];
  const myRank = entries.find(isMineEntry);
  const totalUsers = entries.length;

  return (
    <div className="px-4 py-4 max-w-full space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-cloud rounded-lg">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setRange(tab.id)}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
              range === tab.id
                ? "bg-primary text-on-primary shadow-sm"
                : "text-graphite hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Your rank card */}
      <div className="hp-card-cloud p-3 flex items-center justify-between">
        <div className="text-[12px]">
          {myRank ? (
            <>
              <span className="text-graphite">Your Rank</span>{" "}
              <span className="text-primary font-bold text-[15px] mx-1">
                #{myRank.rank}
              </span>{" "}
              <span className="text-graphite">of {totalUsers}</span>
            </>
          ) : (
            <span className="text-graphite">
              {totalUsers > 0
                ? `${totalUsers}명 집계 중 — 본인 데이터는 동기화 후 표시됩니다`
                : "집계 데이터 대기 중"}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          title="새로고침"
          aria-label="새로고침"
          className="w-8 h-8 rounded-md bg-canvas hover:bg-cloud border border-hairline flex items-center justify-center text-charcoal disabled:opacity-50 transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            className={isFetching ? "animate-spin" : ""}
          >
            <path
              d="M21 12a9 9 0 1 1-3.5-7.13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M21 4v5h-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* List */}
      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-2">
        {isLoading ? (
          <p className="hp-caption text-graphite text-center py-8">불러오는 중...</p>
        ) : isMissingFunction ? (
          <div className="text-center py-6 px-3 space-y-2">
            <p className="text-[12px] font-semibold text-[#dc2626]">
              Supabase RPC <code className="font-mono">get_top_users</code>가 적용되지 않았습니다
            </p>
            <p className="hp-caption text-graphite">
              <code className="font-mono text-[10px]">supabase/migrations/0005_top_users.sql</code>를
              <br />Supabase Studio SQL Editor에서 실행하거나{" "}
              <code className="font-mono text-[10px]">supabase db push</code>로 적용하세요.
            </p>
          </div>
        ) : errorMessage ? (
          <p className="hp-caption text-[#dc2626] text-center py-8 break-all px-3">
            오류: {errorMessage}
          </p>
        ) : entries.length === 0 ? (
          <p className="hp-caption text-graphite text-center py-8">
            아직 집계 데이터가 없습니다
          </p>
        ) : (
          <div className="space-y-0.5">
            {entries.map((entry) => (
              <Row
                key={`${entry.rank}-${entry.display_name}`}
                entry={entry}
                isMine={isMineEntry(entry)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
