import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { Purchase } from "@/types/purchase";

export const purchaseKeys = {
  all: () => ["purchases"] as const,
  list: (params: Record<string, string>) => ["purchases", "list", params] as const,
};

export function usePurchases(params: { search?: string; page?: number }) {
  const queryParams: Record<string, string> = {
    page: String(params.page ?? 1),
  };
  if (params.search) queryParams.search = params.search;

  return useQuery<{ results: Purchase[]; count: number }>({
    queryKey: purchaseKeys.list(queryParams),
    queryFn: async () => {
      const p = new URLSearchParams(queryParams);
      const data = await apiFetch(`${getApiBase()}/purchases/?${p}`);
      return { results: data.results ?? data, count: data.count ?? data.length };
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
