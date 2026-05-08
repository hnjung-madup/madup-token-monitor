interface Props {
  value: number;
  segments?: number;
  color?: "primary" | "amber";
}

const COLOR_CLASSES = {
  primary: { fill: "bg-primary", track: "bg-primary-soft/40" },
  amber: { fill: "bg-[#f5a524]", track: "bg-[#fce6c1]/50" },
} as const;

export function SegmentedBar({ value, segments = 10, color = "primary" }: Props) {
  const clamped = Math.max(0, Math.min(1, value));
  const palette = COLOR_CLASSES[color];
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
