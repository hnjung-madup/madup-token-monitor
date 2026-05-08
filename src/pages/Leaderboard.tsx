import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Avatar } from "@/components/Avatar";
import { buildMockLeaderboard } from "@/mocks/usageMock";
import { formatTokens, formatUSD } from "@/lib/format";
import type { LeaderboardEntry } from "@/types/models";

function MedalIcon({ rank }: { rank: 1 | 2 | 3 }) {
  const palette = {
    1: { bg: "#f5b324", ring: "#c98414", ribbon: "#b3262b" },
    2: { bg: "#c2c2c2", ring: "#8e8e8e", ribbon: "#356373" },
    3: { bg: "#cd7f32", ring: "#8a5320", ribbon: "#5a1313" },
  }[rank];

  return (
    <svg width={28} height={32} viewBox="0 0 28 32" aria-label={`${rank}위`} className="shrink-0">
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
    <span className="hp-display-xs text-graphite font-semibold w-7 text-center">
      {rank}
    </span>
  );
}

function Row({ entry, isMine }: { entry: LeaderboardEntry; isMine: boolean }) {
  return (
    <div
      className={`grid grid-cols-[40px_44px_1fr_auto_auto] items-center gap-4 px-5 py-3 rounded-md border ${
        isMine
          ? "bg-primary-soft/40 border-primary/30"
          : "bg-canvas border-transparent hover:bg-cloud"
      } transition-colors`}
    >
      <div className="flex items-center justify-center">
        <RankCell rank={entry.rank} />
      </div>
      <Avatar src={entry.avatar_url} name={entry.display_name} size={40} rounded="full" />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="hp-body-emphasis text-ink truncate">{entry.display_name}</p>
          {isMine && (
            <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-primary px-1.5 py-0.5 rounded bg-primary-soft">
              나
            </span>
          )}
        </div>
        <p className="hp-caption-sm text-graphite mt-0.5">
          {entry.message_count.toLocaleString("ko-KR")} 메시지
        </p>
      </div>
      <div className="text-right tabular-nums">
        <p className="hp-display-xs text-ink leading-none">
          {formatTokens(entry.total_tokens)}
        </p>
        <p className="hp-caption-sm text-graphite mt-1">
          {formatUSD(entry.cost_usd)}
        </p>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const { t } = useTranslation();
  const { user } = useAuthUser();
  const [data, setData] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setData(buildMockLeaderboard(user?.email));
  }, [user?.email]);

  const myHandle = user?.email ? user.email.split("@")[0] : null;
  const myRank = data.find((d) => d.display_name === myHandle);
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div className="px-10 py-10 max-w-[1100px] mx-auto space-y-10">
      <header className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="hp-eyebrow">Internal Ranking · 30 days</p>
            <span className="text-[10px] tracking-[0.18em] uppercase font-bold px-2 py-0.5 rounded-full bg-bloom-rose text-bloom-deep">
              Demo
            </span>
          </div>
          <h1 className="hp-display-lg text-ink">{t("leaderboard.title")}</h1>
          <p className="hp-body text-charcoal mt-2">
            {t("leaderboard.subtitle")}
          </p>
          <p className="hp-caption text-graphite mt-1">
            ※ 현재는 모의 데이터입니다. Supabase 집계 RPC 연동 후 실제 데이터로 대체됩니다.
          </p>
        </div>
        {myRank && (
          <div className="hp-card-cloud px-6 py-4 text-right">
            <p className="hp-caption-sm uppercase tracking-[0.18em] font-bold text-graphite">
              내 순위
            </p>
            <p className="hp-display-md text-primary mt-1 leading-none">
              {myRank.rank}
              <span className="hp-display-xs text-graphite ml-1">위</span>
            </p>
          </div>
        )}
      </header>

      {/* Top 3 podium */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top3.map((entry) => {
          const isMine = entry.display_name === myHandle;
          return (
            <div
              key={entry.user_id}
              className={`hp-card-flat p-6 text-center shadow-[0_2px_8px_rgba(26,26,26,0.06)] ${
                isMine ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="flex justify-center mb-4">
                <MedalIcon rank={entry.rank as 1 | 2 | 3} />
              </div>
              <Avatar
                src={entry.avatar_url}
                name={entry.display_name}
                size={64}
                rounded="full"
                className="mx-auto"
              />
              <p className="hp-display-xs text-ink mt-3 truncate">
                {entry.display_name}
              </p>
              <p className="hp-caption-sm text-graphite mt-1">
                {entry.message_count.toLocaleString("ko-KR")} 메시지
              </p>
              <div className="mt-4 pt-4 border-t border-hairline">
                <p className="hp-display-md text-primary leading-none">
                  {formatTokens(entry.total_tokens)}
                </p>
                <p className="hp-caption text-graphite mt-2">
                  {formatUSD(entry.cost_usd)}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      {/* 4 - N table */}
      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-3">
        <div className="grid grid-cols-[40px_44px_1fr_auto_auto] items-center gap-4 px-5 py-2 text-[10px] tracking-[0.18em] uppercase font-bold text-graphite">
          <span className="text-center">#</span>
          <span />
          <span>{t("leaderboard.user")}</span>
          <span className="text-right">토큰</span>
          <span />
        </div>
        <div className="space-y-1">
          {rest.map((entry) => (
            <Row
              key={entry.user_id}
              entry={entry}
              isMine={entry.display_name === myHandle}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
