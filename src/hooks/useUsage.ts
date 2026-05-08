import { useQuery } from "@tanstack/react-query";
import { buildMockSummary, type UsageSummary } from "@/mocks/usageMock";

const IS_MOCK = !("__TAURI_INTERNALS__" in window);

async function fetchUsageSummary(days: 1 | 7 | 30): Promise<UsageSummary> {
  if (IS_MOCK) {
    await new Promise((r) => setTimeout(r, 200));
    return buildMockSummary(days);
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<UsageSummary>("get_usage_summary", { days });
}

export function useUsage(days: 1 | 7 | 30) {
  return useQuery({
    queryKey: ["usage", days],
    queryFn: () => fetchUsageSummary(days),
    staleTime: 30_000,
  });
}
