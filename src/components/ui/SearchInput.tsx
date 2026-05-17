import { type ChangeEvent } from "react";

interface SearchInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "검색…",
  className,
}: SearchInputProps) {
  return (
    <label
      className={`flex items-center gap-2 h-7 px-2.5 rounded-md border border-hairline bg-surface-2 text-text-tertiary text-[12px] min-w-0 ${className ?? ""}`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="shrink-0"
      >
        <circle cx="7" cy="7" r="5" />
        <path d="M10.5 10.5L14 14" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent border-0 outline-none text-text-primary text-[12px] font-[inherit] placeholder:text-text-faint"
      />
    </label>
  );
}
