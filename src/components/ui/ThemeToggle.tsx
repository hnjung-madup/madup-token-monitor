import { useEffect, useState } from "react";

const STORAGE_KEY = "madup-theme";

type Theme = "dark" | "light";

function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("theme-light")
    ? "light"
    : "dark";
}

function applyTheme(next: Theme) {
  const root = document.documentElement;
  if (next === "light") root.classList.add("theme-light");
  else root.classList.remove("theme-light");
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* quota / privacy mode — ignore */
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => readTheme());

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    applyTheme(next);
    setTheme(next);
  }

  const isLight = theme === "light";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="테마 전환 (다크 / 라이트)"
      title="테마 전환 (다크 / 라이트)"
      className="mc-icon-btn"
    >
      {isLight ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.2 3.2l1 1M11.8 11.8l1 1M3.2 12.8l1-1M11.8 4.2l1-1" />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 9A5 5 0 017 3a1 1 0 00-1.3-1A6.5 6.5 0 1014 10.3 1 1 0 0013 9z" />
        </svg>
      )}
    </button>
  );
}
