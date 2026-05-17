interface RingMeterProps {
  /// 0..1
  value: number;
  size?: number;
  stroke?: number;
  centerLabel?: string;
  centerColor?: string;
  className?: string;
}

/// 도넛 미터 — quota / progress 표현. center 라벨은 mono 퍼센트.
/// stroke color 는 신호 (lime 0~40% / amber 40~80% / coral ≥80% / violet 강조용 override).
function pickStroke(value: number): string {
  if (value >= 0.8) return "var(--color-coral)";
  if (value >= 0.4) return "var(--color-amber)";
  return "var(--color-lime)";
}

export function RingMeter({
  value,
  size = 64,
  stroke = 6,
  centerLabel,
  centerColor,
  className,
}: RingMeterProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * clamped;
  const color = centerColor ?? pickStroke(clamped);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - dash}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {centerLabel && (
        <text
          x={size / 2}
          y={size / 2 + 4}
          textAnchor="middle"
          fontSize={size * 0.18}
          fontWeight={600}
          fill={color}
          fontFamily="JetBrains Mono, monospace"
        >
          {centerLabel}
        </text>
      )}
    </svg>
  );
}
