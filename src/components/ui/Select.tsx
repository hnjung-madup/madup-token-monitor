import { useEffect, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  className?: string;
}

export function Select({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !popoverRef.current?.contains(t)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md border border-hairline bg-canvas text-charcoal hover:border-ink transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
      >
        <span>{selected?.label ?? value}</span>
        <svg
          width="9"
          height="9"
          viewBox="0 0 12 12"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            d="M3 4.5 L6 7.5 L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          ref={popoverRef}
          role="listbox"
          className="absolute z-20 mt-1 left-0 min-w-full rounded-md border border-hairline bg-canvas shadow-[0_4px_12px_rgba(26,26,26,0.08)] overflow-hidden"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`block w-full text-left px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-charcoal hover:bg-cloud"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
