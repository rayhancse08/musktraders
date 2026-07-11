import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { Brand } from "@/types/brand";

export function useBrands() {
  return useQuery<Brand[]>({
    queryKey: ["brands", "all"],
    queryFn: async () => {
      const data = await apiFetch(`${getApiBase()}/brands/?page_size=500`);
      return data.results ?? data;
    },
    staleTime: 60_000,
  });
}
