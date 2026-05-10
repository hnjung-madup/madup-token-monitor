interface Props {
  value: number;
  segments?: number;
  color?: "primary" | "amber" | "quota";
}

const COLOR_CLASSES = {
  primary: { fill: "bg-primary", track: "bg-primary-soft/40" },
  amber: { fill: "bg-[#f5a524]", track: "bg-[#fce6c1]/50" },
} as const;

// quota 모드: 사용률에 따라 초록(<40%) / 주황(<80%) / 빨강(>=80%) 으로 분기.
function quotaPalette(value: number) {
  if (value >= 0.8) return { fill: "bg-[#dc2626]", track: "bg-[#fecaca]/50" };
  if (value >= 0.4) return { fill: "bg-[#f5a524]", track: "bg-[#fce6c1]/50" };
  return { fill: "bg-[#16a34a]", track: "bg-[#bbf7d0]/50" };
}

export function SegmentedBar({ value, segments = 10, color = "primary" }: Props) {
  const clamped = Math.max(0, Math.min(1, value));
  const palette = color === "quota" ? quotaPalette(clamped) : COLOR_CLASSES[color];
  const filled = Math.round(clamped * segments);

  return (
    <div className="flex gap-1 h-2 w-full">
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm transition-colors ${
            i < filled ? palette.fill : palette.track
          }`}
        />
      ))}
    </div>
  );
}

/// quota 색상을 텍스트(%)에도 동일 룰로 적용하기 위한 유틸.
export function quotaTextColor(value: number): string {
  if (value >= 0.8) return "text-[#dc2626]";
  if (value >= 0.4) return "text-[#f5a524]";
  return "text-[#16a34a]";
}
