import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { Vendor } from "@/types/vendor";

export const vendorKeys = {
  all: () => ["vendors"] as const,
  list: (params: Record<string, string>) => ["vendors", "list", params] as const,
};

export function useVendors(params: { search?: string; page?: number }) {
  const queryParams: Record<string, string> = {
    page: String(params.page ?? 1),
  };
  if (params.search) queryParams.search = params.search;

  return useQuery<{ results: Vendor[]; count: number }>({
    queryKey: vendorKeys.list(queryParams),
    queryFn: async () => {
      const p = new URLSearchParams(queryParams);
      const data = await apiFetch(`${getApiBase()}/vendors/?${p}`);
      return { results: data.results ?? data, count: data.count ?? data.length };
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
