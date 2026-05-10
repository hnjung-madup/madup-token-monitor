interface Row {
  label: string;
  value: number;
}

interface Props {
  title?: string;
  items: Row[];
  color?: string;
  formatValue?: (v: number) => string;
  emptyMessage?: string;
}

export function MinimalBarList({
  title,
  items,
  color = "#0aa9c9",
  formatValue = (v) => v.toLocaleString("ko-KR"),
  emptyMessage = "데이터가 없습니다",
}: Props) {
  if (items.length === 0) {
    return (
      <div>
        {title && (
          <p className="text-[10px] tracking-[0.18em] uppercase font-bold text-graphite mb-3">
            {title}
          </p>
        )}
        <p className="hp-caption text-graphite py-4 text-center">{emptyMessage}</p>
      </div>
    );
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div>
      {title && (
        <p className="text-[10px] tracking-[0.18em] uppercase font-bold text-graphite mb-3">
          {title}
        </p>
      )}
      <div className="space-y-1.5">
        {items.map((it) => {
          const ratio = it.value / max;
          return (
            <div
              key={it.label}
              className="grid grid-cols-[88px_1fr_56px] items-center gap-2 text-[12px]"
            >
              <span
                className="text-right font-medium text-charcoal truncate"
                title={it.label}
              >
                {it.label}
              </span>
              <div className="h-1.5 rounded-full bg-cloud overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${ratio * 100}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-right font-semibold text-ink tabular-nums">
                {formatValue(it.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
