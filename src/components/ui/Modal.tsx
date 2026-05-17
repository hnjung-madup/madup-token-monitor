import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /// 패널 최대 폭 (px). 기본 880.
  maxWidth?: number;
}

/// body portal 모달. Esc / 백드롭 클릭 / 닫기 버튼으로 닫힘.
/// body scroll lock + 초기 포커스 이동 + 단순 포커스 트랩.
export function Modal({ open, onClose, title, children, maxWidth = 880 }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    // 초기 포커스
    const id = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        ?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-8"
      style={{ background: "rgba(7,11,23,0.7)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="mc-card-feature w-full max-h-[85vh] overflow-hidden flex flex-col"
        style={{ maxWidth }}
      >
        <header className="flex items-center justify-between gap-3 mb-3 shrink-0">
          <div className="text-[16px] font-semibold text-text-primary">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="mc-icon-btn"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </header>
        <div className="overflow-y-auto min-h-0">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
