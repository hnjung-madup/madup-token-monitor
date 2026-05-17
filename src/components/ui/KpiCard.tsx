import type { ReactNode } from "react";

type SignalColor = "azure" | "amber" | "lime" | "violet" | "coral";

interface KpiCardProps {
  eyebrow: string;
  value: string;
  suffix?: ReactNode;
  context?: ReactNode;
  color?: SignalColor;
  className?: string;
}

const COLOR_CLASS: Record<SignalColor, string> = {
  azure: "text-azure",
  amber: "text-amber",
  lime: "text-lime",
  violet: "text-violet",
  coral: "text-coral",
};

/// 대시보드의 시그니처 리듬: eyebrow → mono numeral → context.
export function KpiCard({
  eyebrow,
  value,
  suffix,
  context,
  color = "azure",
  className,
}: KpiCardProps) {
  return (
    <div className={className}>
      <p className="mc-eyebrow mb-3">{eyebrow}</p>
      <div className="flex items-baseline gap-2">
        <span
          className={`num text-[48px] font-medium leading-none tracking-[-0.02em] ${COLOR_CLASS[color]}`}
        >
          {value}
        </span>
        {suffix && (
          <span className="text-[13px] text-text-secondary font-normal">
            {suffix}
          </span>
        )}
      </div>
      {context && (
        <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[12px] text-text-secondary">
          {context}
        </div>
      )}
    </div>
  );
}
