import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { Purchase, PurchaseDetail, PurchaseListSummary } from "@/types/purchase";

export const purchaseKeys = {
  all: () => ["purchases"] as const,
  list: (params: Record<string, string>) => ["purchases", "list", params] as const,
  detail: (id: number) => ["purchases", "detail", id] as const,
};

export type PurchaseListParams = {
  search?: string;
  page?: number;
  vendor?: string;
  dateRange?: string;
};

export function usePurchases(params: PurchaseListParams) {
  const queryParams: Record<string, string> = {
    page: String(params.page ?? 1),
  };
  if (params.search) queryParams.search = params.search;
  if (params.vendor) queryParams.vendor = params.vendor;
  if (params.dateRange) queryParams.date_range = params.dateRange;

  return useQuery<{ results: Purchase[]; count: number; summary: PurchaseListSummary }>({
    queryKey: purchaseKeys.list(queryParams),
    queryFn: () => apiFetch(`${getApiBase()}/purchases/?${new URLSearchParams(queryParams)}`),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function usePurchase(id: number | null) {
  return useQuery<PurchaseDetail>({
    queryKey: purchaseKeys.detail(id ?? 0),
    queryFn: () => apiFetch(`${getApiBase()}/purchases/${id}/`),
    enabled: id != null,
  });
}

export function useSavePurchase(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation<PurchaseDetail, Error, Record<string, unknown>>({
    mutationFn: (body) =>
      apiFetch(id ? `${getApiBase()}/purchases/${id}/` : `${getApiBase()}/purchases/`, {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(purchaseKeys.detail(saved.id), saved);
      queryClient.invalidateQueries({ queryKey: ["purchases", "list"] });
    },
  });
}

export function useDeletePurchase() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, number>({
    mutationFn: (id) => apiFetch(`${getApiBase()}/purchases/${id}/`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseKeys.all() }),
  });
}
