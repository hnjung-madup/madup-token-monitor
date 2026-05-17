type Signal = "lime" | "amber" | "coral";

interface QuotaSegBarProps {
  /// 0..1
  value: number;
  segments?: number;
  className?: string;
}

function pickSignal(v: number): Signal {
  if (v >= 0.8) return "coral";
  if (v >= 0.4) return "amber";
  return "lime";
}

const FULL_BG: Record<Signal, string> = {
  lime: "var(--color-lime)",
  amber: "var(--color-amber)",
  coral: "var(--color-coral)",
};

const DIM_BG: Record<Signal, string> = {
  lime: "rgba(155,225,93,0.35)",
  amber: "rgba(245,181,68,0.35)",
  coral: "rgba(255,107,92,0.35)",
};

const GLOW: Record<Signal, string> = {
  lime: "0 0 8px rgba(155,225,93,0.45)",
  amber: "0 0 8px rgba(245,181,68,0.45)",
  coral: "0 0 8px rgba(255,107,92,0.45)",
};

/// 12-세그먼트 quota meter — pacing-in-time 표현. 신호색은 사용률에 자동 매핑.
/// 채워진 만큼 fully filled, 마지막 부분 채움은 dim 으로.
export function QuotaSegBar({
  value,
  segments = 12,
  className,
}: QuotaSegBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const signal = pickSignal(clamped);
  const exact = clamped * segments;
  const full = Math.floor(exact);
  const partial = exact - full > 0 && full < segments;

  return (
    <div className={`flex gap-[3px] h-2.5 ${className ?? ""}`}>
      {Array.from({ length: segments }).map((_, i) => {
        let style: React.CSSProperties;
        if (i < full) {
          style = { background: FULL_BG[signal], boxShadow: GLOW[signal] };
        } else if (i === full && partial) {
          style = { background: DIM_BG[signal] };
        } else {
          style = { background: "var(--color-surface-3)" };
        }
        return (
          <div key={i} className="flex-1 rounded-[3px]" style={style} />
        );
      })}
    </div>
  );
}

export function quotaSignalClass(value: number): string {
  const s = pickSignal(Math.max(0, Math.min(1, value)));
  return s === "lime"
    ? "text-lime"
    : s === "amber"
      ? "text-amber"
      : "text-coral";
}
