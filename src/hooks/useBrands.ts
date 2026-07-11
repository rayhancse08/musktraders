import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { Brand } from "@/types/brand";

export const brandKeys = {
  all: () => ["brands"] as const,
  list: (params: Record<string, string>) => ["brands", "list", params] as const,
};

export function useBrandsAll() {
  return useQuery<Brand[]>({
    queryKey: [...brandKeys.all(), "all"],
    queryFn: async () => {
      const data = await apiFetch(`${getApiBase()}/brands/?page_size=500`);
      return data.results ?? data;
    },
    staleTime: 120_000,
  });
}

export function useBrands(params: { search?: string; page?: number } = {}) {
  const queryParams: Record<string, string> = {};
  if (params.page) queryParams.page = String(params.page);
  if (params.search) queryParams.search = params.search;

  return useQuery<{ results: Brand[]; count: number }>({
    queryKey: brandKeys.list(queryParams),
    queryFn: async () => {
      const p = new URLSearchParams(queryParams);
      const data = await apiFetch(`${getApiBase()}/brands/?${p}`);
      return { results: data.results ?? data, count: data.count ?? data.length };
    },
    placeholderData: keepPreviousData,
    staleTime: 120_000,
  });
}
