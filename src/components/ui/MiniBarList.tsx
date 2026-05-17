interface MiniBarListItem {
  label: string;
  value: number;
}

type Variant = "azure" | "violet" | "lime" | "amber";

interface MiniBarListProps {
  items: MiniBarListItem[];
  formatValue?: (v: number) => string;
  /// 가장 큰 값에 적용할 색. 그 외는 azure.
  emphasizeMax?: Variant;
  emptyMessage?: string;
  className?: string;
}

const FILL: Record<Variant, string> = {
  azure: "linear-gradient(90deg, var(--color-azure-deep), var(--color-azure))",
  violet:
    "linear-gradient(90deg, var(--color-violet-deep), var(--color-violet))",
  lime: "linear-gradient(90deg, var(--color-lime-deep), var(--color-lime))",
  amber: "linear-gradient(90deg, var(--color-amber-deep), var(--color-amber))",
};
const TEXT: Record<Variant, string> = {
  azure: "text-azure",
  violet: "text-violet",
  lime: "text-lime",
  amber: "text-amber",
};

/// 라벨 + 값 (mono) + 4px 가는 막대. 도구별/모델별 분포 표시.
export function MiniBarList({
  items,
  formatValue = (v) => v.toLocaleString("ko-KR"),
  emphasizeMax,
  emptyMessage = "기록 없음",
  className,
}: MiniBarListProps) {
  if (items.length === 0) {
    return (
      <p className="text-[12px] text-text-tertiary py-4 text-center">
        {emptyMessage}
      </p>
    );
  }
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className={`flex flex-col gap-3.5 ${className ?? ""}`}>
      {items.map((it, idx) => {
        const ratio = it.value / max;
        const isMax = idx === 0 && emphasizeMax !== undefined;
        const variant: Variant = isMax ? emphasizeMax! : "azure";
        return (
          <div key={`${it.label}-${idx}`}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span
                className="text-[12px] font-medium text-text-primary truncate"
                title={it.label}
              >
                {it.label}
              </span>
              <span
                className={`num text-[12px] font-medium whitespace-nowrap shrink-0 ${TEXT[variant]}`}
              >
                {formatValue(it.value)}
              </span>
            </div>
            <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(2, ratio * 100)}%`,
                  background: FILL[variant],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
