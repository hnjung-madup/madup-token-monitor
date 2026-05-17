import type { ReactNode } from "react";

interface ChipProps {
  active?: boolean;
  count?: number;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

export function Chip({ active, count, onClick, children, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mc-chip ${className ?? ""}`}
      data-active={active ? "true" : undefined}
    >
      <span>{children}</span>
      {count != null && (
        <span className="num text-[10.5px] text-text-tertiary [[data-active=true]_&]:text-azure-bright">
          {count}
        </span>
      )}
    </button>
  );
}
