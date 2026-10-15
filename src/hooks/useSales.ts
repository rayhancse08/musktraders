import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { AvailableLot, Sale, SaleDetail, SaleListSummary } from "@/types/sale";

export const saleKeys = {
  all: () => ["sales"] as const,
  list: (params: Record<string, string>) => ["sales", "list", params] as const,
  detail: (id: number) => ["sales", "detail", id] as const,
  lots: (product: string, sale: number | null) => ["sales", "lots", product, sale] as const,
};

export type SaleListParams = {
  search?: string;
  status?: string;
  store?: string;
  dateRange?: string;
  page?: number;
};

export function useSales(params: SaleListParams) {
  const queryParams: Record<string, string> = { page: String(params.page ?? 1) };
  if (params.search) queryParams.search = params.search;
  if (params.status) queryParams.status = params.status;
  if (params.store) queryParams.store = params.store;
  if (params.dateRange) queryParams.date_range = params.dateRange;

  return useQuery<{ results: Sale[]; count: number; summary: SaleListSummary }>({
    queryKey: saleKeys.list(queryParams),
    queryFn: () => apiFetch(`${getApiBase()}/sales/?${new URLSearchParams(queryParams)}`),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useSale(id: number | null) {
  return useQuery<SaleDetail>({
    queryKey: saleKeys.detail(id ?? 0),
    queryFn: () => apiFetch(`${getApiBase()}/sales/${id}/`),
    enabled: id != null,
  });
}

/** Warehouse lots a product can be sold from, oldest first (includes this sale's own allocation). */
export function availableLotsQuery(product: string, saleId: number | null) {
  return {
    queryKey: saleKeys.lots(product, saleId),
    queryFn: async (): Promise<AvailableLot[]> => {
      const params = new URLSearchParams({ product });
      if (saleId) params.set("sale", String(saleId));
      const res = await apiFetch(`${getApiBase()}/sales/available-lots/?${params}`);
      return res.results ?? [];
    },
    enabled: !!product,
    staleTime: 30_000,
  };
}

export function useSaveSale(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation<SaleDetail, Error, Record<string, unknown>>({
    mutationFn: (body) =>
      apiFetch(id ? `${getApiBase()}/sales/${id}/` : `${getApiBase()}/sales/`, {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(saleKeys.detail(saved.id), saved);
      queryClient.invalidateQueries({ queryKey: ["sales", "list"] });
      queryClient.invalidateQueries({ queryKey: ["sales", "lots"] });
    },
  });
}

export function useSaleStatus(id: number) {
  const queryClient = useQueryClient();
  return useMutation<SaleDetail, Error, string>({
    mutationFn: (status) =>
      apiFetch(`${getApiBase()}/sales/${id}/status/`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (saved) => {
      queryClient.setQueryData(saleKeys.detail(saved.id), saved);
      queryClient.invalidateQueries({ queryKey: ["sales", "list"] });
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, number>({
    mutationFn: (id) => apiFetch(`${getApiBase()}/sales/${id}/`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: saleKeys.all() }),
  });
}
