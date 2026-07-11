import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { WarehouseItem } from "@/types/warehouse";

export const warehouseKeys = {
  all: () => ["warehouse"] as const,
  list: (params: Record<string, string>) => ["warehouse", "list", params] as const,
};

export function useWarehouseItems(params: {
  search?: string;
  lotFilter?: string;
  page?: number;
}) {
  const queryParams: Record<string, string> = {
    page: String(params.page ?? 1),
  };
  if (params.search) queryParams.search = params.search;
  if (params.lotFilter) queryParams.lot_number__icontains = params.lotFilter;

  return useQuery<{ results: WarehouseItem[]; count: number }>({
    queryKey: warehouseKeys.list(queryParams),
    queryFn: async () => {
      const p = new URLSearchParams(queryParams);
      const data = await apiFetch(`${getApiBase()}/warehouse/?${p}`);
      return { results: data.results ?? data, count: data.count ?? data.length };
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
