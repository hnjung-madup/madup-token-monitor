import type { DayCount } from "@/types/models";
import { formatUSD } from "@/lib/format";

interface Props {
  data: DayCount[];
  weeks?: number;
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function getColor(count: number, max: number): string {
  if (count === 0) return "bg-cloud border border-hairline";
  const ratio = count / max;
  if (ratio < 0.2) return "bg-primary/15";
  if (ratio < 0.4) return "bg-primary/35";
  if (ratio < 0.6) return "bg-primary/55";
  if (ratio < 0.8) return "bg-primary/75";
  return "bg-primary";
}

// Group days into weeks (column = week, row = weekday Mon-Sun).
// Pads the head so that the first column starts on Monday of that week.
function buildGrid(data: DayCount[]) {
  if (data.length === 0) return { columns: [], months: [] as { col: number; label: string }[] };
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const first = new Date(sorted[0].date);
  const firstDow = (first.getDay() + 6) % 7; // Monday=0..Sunday=6
  const padded: (DayCount | null)[] = Array(firstDow).fill(null).concat(sorted);
  const columns: (DayCount | null)[][] = [];
  const months: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let i = 0; i < padded.length; i += 7) {
    const col = padded.slice(i, i + 7);
    while (col.length < 7) col.push(null);
    columns.push(col);
    const firstReal = col.find((c) => c !== null);
    if (firstReal) {
      const m = new Date(firstReal.date).getMonth();
      if (m !== lastMonth) {
        months.push({ col: columns.length - 1, label: `${m + 1}월` });
        lastMonth = m;
      }
    }
  }
  return { columns, months };
}

export function HeatMap({ data, weeks = 8 }: Props) {
  const slice = data.slice(-weeks * 7);
  const { columns, months } = buildGrid(slice);
  const max = Math.max(...slice.map((d) => d.count), 1);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Month headers */}
      <div className="grid pl-7" style={{ gridTemplateColumns: `repeat(${columns.length}, 14px)`, gap: 4 }}>
        {Array.from({ length: columns.length }).map((_, ci) => {
          const m = months.find((mm) => mm.col === ci);
          return (
            <span key={ci} className="text-[10px] uppercase tracking-[0.12em] font-bold text-graphite text-left whitespace-nowrap">
              {m?.label ?? ""}
            </span>
          );
        })}
      </div>

      {/* Grid: day labels column + week columns */}
      <div className="flex gap-1">
        {/* Day labels (Mon, Wed, Fri visible) */}
        <div className="flex flex-col gap-1 pr-1">
          {DAY_LABELS.map((label, i) => (
            <span
              key={label}
              className="h-[14px] text-[10px] text-graphite leading-[14px]"
              style={{ visibility: i % 2 === 0 ? "visible" : "hidden" }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Week columns */}
        <div className="flex gap-1">
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {col.map((day, ri) =>
                day ? (
                  <div key={ri} className="relative group">
                    <div
                      className={`w-[14px] h-[14px] rounded-[3px] ${getColor(day.count, max)}`}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 pointer-events-none">
                      <div className="bg-canvas text-ink text-[11px] rounded-md px-2 py-1 whitespace-nowrap shadow-md border border-hairline">
                        <div className="font-medium">{day.date}</div>
                        <div className="text-graphite">{day.count}건 · {formatUSD(day.cost_usd)}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={ri} className="w-[14px] h-[14px]" />
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
