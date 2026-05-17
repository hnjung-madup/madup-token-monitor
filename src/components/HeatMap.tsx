import type { DayCount } from "@/types/models";
import { formatUSD } from "@/lib/format";

interface Props {
  data: DayCount[];
  weeks?: number;
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;

/// 5단계 azure 램프 + 오늘 셀은 violet 강조.
function levelClass(count: number, max: number): string {
  if (count === 0) return "bg-surface-2";
  const ratio = count / max;
  if (ratio < 0.2) return "bg-azure-deep opacity-55";
  if (ratio < 0.4) return "bg-azure-deep";
  if (ratio < 0.7) return "bg-azure";
  return "bg-azure-bright shadow-[0_0_6px_rgba(123,188,255,0.35)]";
}

/// 7행(요일) × N열(주) 매트릭스.
/// 오늘 기준 최근 `weeks*7` 일을 빠짐없이 연속 생성 — 데이터 없는 날은 count 0
/// (투명 padding 아님, surface-2 셀 + "0건" tooltip). 월요일 정렬용 head/tail
/// padding 만 null(투명).
function buildMatrix(data: DayCount[], weeks: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = localKey(today);
  const totalDays = weeks * 7;
  const byDate = new Map(data.map((d) => [d.date, d]));

  const series: DayCount[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = localKey(d);
    series.push(byDate.get(key) ?? { date: key, count: 0, cost_usd: 0 });
  }

  // 첫 날짜 요일에 맞춰 앞쪽 padding (월요일 시작) — 진짜 grid 공백만 null.
  const first = new Date(series[0].date + "T00:00:00");
  const headPad = (first.getDay() + 6) % 7; // Mon=0
  const padded: (DayCount | null)[] = Array(headPad).fill(null).concat(series);
  while (padded.length % 7 !== 0) padded.push(null);

  // 7×N 매트릭스: rows[day][week]
  const rows: (DayCount | null)[][] = Array.from({ length: 7 }, () => []);
  for (let i = 0; i < padded.length; i++) {
    rows[i % 7].push(padded[i]);
  }
  const maxLen = Math.max(...rows.map((r) => r.length));
  for (const r of rows) while (r.length < maxLen) r.push(null);

  return { rows, todayKey };
}

function localKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function HeatMap({ data, weeks = 8 }: Props) {
  const { rows, todayKey } = buildMatrix(data, weeks);
  const max = Math.max(...data.map((d) => d.count), 1);

  // Week column labels = 첫 셀의 날짜의 day-of-month.
  const weekLabels: string[] = [];
  if (rows[0].length > 0) {
    for (let w = 0; w < rows[0].length; w++) {
      // 그 주의 첫 non-null 셀의 날짜를 사용
      let label = "";
      for (let d = 0; d < 7; d++) {
        const cell = rows[d][w];
        if (cell) {
          label = String(new Date(cell.date + "T00:00:00").getDate());
          break;
        }
      }
      weekLabels.push(label);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {/* 7 day-rows */}
      {rows.map((row, di) => (
        <div key={di} className="flex gap-1 items-center">
          <span className="w-[22px] text-right text-[10px] text-text-faint shrink-0">
            {di % 2 === 0 ? DAY_LABELS[di] : ""}
          </span>
          {row.map((cell, wi) => {
            const isToday = cell?.date === todayKey;
            return cell ? (
              <div key={wi} className="relative group">
                <div
                  className={`w-4 h-4 rounded-[4px] border border-[rgba(255,255,255,0.02)] ${
                    isToday
                      ? "bg-violet shadow-[0_0_8px_rgba(182,140,255,0.45)]"
                      : levelClass(cell.count, max)
                  }`}
                />
                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-10 pointer-events-none">
                  <div className="bg-surface-2 border border-hairline-strong rounded-md px-2 py-1 text-[11px] whitespace-nowrap shadow-lg">
                    <div className="num font-medium text-text-primary">{cell.date}</div>
                    <div className="text-text-tertiary num">
                      {cell.count}건 · {formatUSD(cell.cost_usd)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div key={wi} className="w-4 h-4" />
            );
          })}
        </div>
      ))}

      {/* Week labels (day-of-month) */}
      <div className="flex gap-1 mt-1.5 ml-[26px]">
        {weekLabels.map((l, i) => (
          <span
            key={i}
            className="w-4 text-center num text-[9.5px] text-text-faint"
          >
            {l}
          </span>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 text-[10.5px] text-text-tertiary">
        <span>Less</span>
        <div className="flex gap-[3px]">
          <span className="w-[11px] h-[11px] rounded-[3px] bg-surface-2" />
          <span className="w-[11px] h-[11px] rounded-[3px] bg-azure-deep opacity-55" />
          <span className="w-[11px] h-[11px] rounded-[3px] bg-azure-deep" />
          <span className="w-[11px] h-[11px] rounded-[3px] bg-azure" />
          <span className="w-[11px] h-[11px] rounded-[3px] bg-azure-bright" />
        </div>
        <span>More</span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span className="w-[11px] h-[11px] rounded-[3px] bg-violet shadow-[0_0_6px_rgba(182,140,255,0.45)]" />
          오늘
        </span>
      </div>
    </div>
  );
}
