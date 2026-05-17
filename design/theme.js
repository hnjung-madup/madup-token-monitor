/* ============================================================
   Madup Console — Theme toggle (dark / light) with persistence.
   Reads / writes localStorage('madup-theme') = 'dark' | 'light'.
   Wires up any .theme-toggle button on the page.
   ============================================================ */

(function () {
  const STORAGE_KEY = "madup-theme";
  function apply(theme) {
    const root = document.documentElement;
    if (theme === "light") root.classList.add("theme-light");
    else root.classList.remove("theme-light");
  }
  function current() {
    return document.documentElement.classList.contains("theme-light") ? "light" : "dark";
  }
  function toggle() {
    const next = current() === "light" ? "dark" : "light";
    apply(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
  }

  // Apply persisted theme as early as possible.
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") apply(saved);
  } catch (e) {}

  // Wire all theme-toggle buttons after DOM is ready.
  function wire() {
    document.querySelectorAll(".theme-toggle").forEach((btn) => {
      if (btn.dataset.wired) return;
      btn.dataset.wired = "1";
      btn.addEventListener("click", toggle);
      btn.setAttribute("aria-label", "테마 전환");
      btn.setAttribute("title", "테마 전환 (다크 / 라이트)");
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }

  // Expose for external triggers (e.g., keyboard shortcut)
  window.MadupTheme = { apply, toggle, current };
})();
