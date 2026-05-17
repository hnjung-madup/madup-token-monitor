interface RankBarListItem {
  label: string;
  value: number;
}

type Variant = "azure" | "violet" | "lime" | "amber" | "coral";

interface RankBarListProps {
  items: RankBarListItem[];
  formatValue?: (v: number) => string;
  /// 매 N번째 row 에 강조 색을 순환 배정. mockup 의 azure / violet / lime / amber / coral 톤 사용.
  variants?: Variant[];
  emptyMessage?: string;
  maxRows?: number;
  className?: string;
}

const FILL: Record<Variant, string> = {
  azure: "linear-gradient(90deg, var(--color-azure-deep), var(--color-azure))",
  violet:
    "linear-gradient(90deg, var(--color-violet-deep), var(--color-violet))",
  lime: "linear-gradient(90deg, var(--color-lime-deep), var(--color-lime))",
  amber: "linear-gradient(90deg, var(--color-amber-deep), var(--color-amber))",
  coral: "linear-gradient(90deg, var(--color-coral-deep), var(--color-coral))",
};
const TEXT: Record<Variant, string> = {
  azure: "text-azure",
  violet: "text-violet",
  lime: "text-lime",
  amber: "text-amber",
  coral: "text-coral",
};

const DEFAULT_VARIANTS: Variant[] = ["azure", "azure", "violet", "azure", "lime", "azure", "amber", "azure"];

/// 랭크 글리프 + 라벨 + mono 값 + 5px gradient 막대. CompanyDashboard 의 MCP/플러그인/모델 분포용.
export function RankBarList({
  items,
  formatValue = (v) => v.toLocaleString("ko-KR"),
  variants = DEFAULT_VARIANTS,
  emptyMessage = "기록 없음",
  maxRows = 8,
  className,
}: RankBarListProps) {
  const rows = items.slice(0, maxRows);
  if (rows.length === 0) {
    return (
      <p className="text-[12px] text-text-tertiary py-6 text-center">
        {emptyMessage}
      </p>
    );
  }
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className={`flex flex-col gap-3.5 ${className ?? ""}`}>
      {rows.map((it, idx) => {
        const variant: Variant = variants[idx % variants.length];
        const ratio = it.value / max;
        return (
          <div key={`${it.label}-${idx}`}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="flex items-center gap-2 min-w-0 text-[12px] text-text-primary font-medium">
                <span className="num shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-surface-2 text-text-tertiary text-[10px] font-semibold">
                  {idx + 1}
                </span>
                <span className="truncate" title={it.label}>
                  {it.label}
                </span>
              </span>
              <span
                className={`num text-[12px] font-medium whitespace-nowrap shrink-0 ${TEXT[variant]}`}
              >
                {formatValue(it.value)}
              </span>
            </div>
            <div className="h-[5px] bg-surface-3 rounded-full overflow-hidden">
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
