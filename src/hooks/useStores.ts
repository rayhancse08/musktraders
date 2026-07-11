import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { Store } from "@/types/store";

export const storeKeys = {
  all: () => ["stores"] as const,
  list: (params: Record<string, string>) => ["stores", "list", params] as const,
};

export function useStores(params: { search?: string; page?: number }) {
  const queryParams: Record<string, string> = {
    page: String(params.page ?? 1),
  };
  if (params.search) queryParams.search = params.search;

  return useQuery<{ results: Store[]; count: number }>({
    queryKey: storeKeys.list(queryParams),
    queryFn: async () => {
      const p = new URLSearchParams(queryParams);
      const data = await apiFetch(`${getApiBase()}/stores/?${p}`);
      return { results: data.results ?? data, count: data.count ?? data.length };
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
