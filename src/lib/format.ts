const KRW_PER_USD = 1380;

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M tok`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K tok`;
  return `${n} tok`;
}

export function formatUSD(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
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
  return `${(n * 100).toFixed(1)}%`;
}
