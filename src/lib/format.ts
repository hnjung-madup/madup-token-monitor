const KRW_PER_USD = 1380;

export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) {
    const v = n / 1_000_000_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1)}B tok`;
  }
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M tok`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K tok`;
  return `${Math.round(n)} tok`;
}

export function formatUSD(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(usd);
}

export function formatKRW(usd: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(usd * KRW_PER_USD);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(dateStr));
}

export function formatPercent(n: number): string {
  return `${Math.round(n * 100)}%`;
}

// Compact tokens without "tok" suffix — for hero displays.
export function formatTokensCompact(n: number): string {
  if (n >= 1_000_000_000) {
    const v = n / 1_000_000_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1)}B`;
  }
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${Math.round(n)}`;
}

export function formatRelativeTime(ms: number): string {
  if (ms <= 0) return "0m";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86_400);
  const h = Math.floor((totalSec % 86_400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m && d === 0) parts.push(`${m}m`);
  return parts.join(" ") || `${totalSec}s`;
}
