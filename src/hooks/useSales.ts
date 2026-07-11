import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { Sale } from "@/types/sale";

export const saleKeys = {
  all: () => ["sales"] as const,
  list: (params: Record<string, string>) => ["sales", "list", params] as const,
};

export function useSales(params: { search?: string; status?: string; page?: number }) {
  const queryParams: Record<string, string> = {
    page: String(params.page ?? 1),
  };
  if (params.search) queryParams.search = params.search;
  if (params.status) queryParams.status = params.status;

  return useQuery<{ results: Sale[]; count: number }>({
    queryKey: saleKeys.list(queryParams),
    queryFn: async () => {
      const p = new URLSearchParams(queryParams);
      const data = await apiFetch(`${getApiBase()}/sales/?${p}`);
      return { results: data.results ?? data, count: data.count ?? data.length };
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
