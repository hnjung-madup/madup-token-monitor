import type { DayCount } from "@/types/models";
import { formatUSD } from "@/lib/format";

interface Props {
  data: DayCount[];
}

function getColor(count: number, max: number): string {
  if (count === 0) return "bg-muted";
  const ratio = count / max;
  if (ratio < 0.2) return "bg-primary/20";
  if (ratio < 0.4) return "bg-primary/40";
  if (ratio < 0.6) return "bg-primary/60";
  if (ratio < 0.8) return "bg-primary/80";
  return "bg-primary";
}

export function HeatMap({ data }: Props) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex flex-wrap gap-1">
      {data.map((d) => (
        <div key={d.date} className="relative group">
          <div
            className={`w-4 h-4 rounded-sm cursor-default transition-opacity ${getColor(d.count, max)}`}
          />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
            <div className="bg-popover text-popover-foreground text-xs rounded px-2 py-1 whitespace-nowrap shadow-md border">
              <div className="font-medium">{d.date}</div>
              <div>{d.count}건 · {formatUSD(d.cost_usd)}</div>
            </div>
            <div className="w-2 h-2 bg-popover border-b border-r rotate-45 -mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
}
