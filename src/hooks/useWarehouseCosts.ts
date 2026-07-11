import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import {
  MonthlyWarehouseCost, MonthlyWarehouseCostDetail,
  WarehouseCostItem, CostTypeOption,
  WarehouseCostFormData, MonthlyFileFormData,
} from "@/types/warehouse_cost";

// ── Query keys ────────────────────────────────────────────────────────────────
export const warehouseCostKeys = {
  all:        () => ["warehouse-costs"]               as const,
  monthly:    (year?: string) => ["warehouse-costs", "monthly", year] as const,
  detail:     (id: number)    => ["warehouse-costs", "detail", id]    as const,
  costTypes:  ()              => ["warehouse-costs", "cost-types"]     as const,
  items:      (monthId?: number) => ["warehouse-costs", "items", monthId] as const,
};

// ── Cost type choices (cached — never changes) ────────────────────────────────
export function useCostTypes() {
  return useQuery<CostTypeOption[]>({
    queryKey: warehouseCostKeys.costTypes(),
    queryFn:  () => apiFetch(`${getApiBase()}/warehouse-costs/monthly/cost-types/`),
    staleTime: Infinity,  // static list, never refetch
  });
}

// ── Monthly file list ─────────────────────────────────────────────────────────
export function useMonthlyFiles(year: string) {
  return useQuery<MonthlyWarehouseCost[]>({
    queryKey: warehouseCostKeys.monthly(year),
    queryFn: async () => {
      const params = new URLSearchParams({ year });
      const data = await apiFetch(`${getApiBase()}/warehouse-costs/monthly/?${params}`);
      return data.results ?? data;
    },
    staleTime: 30_000,
  });
}

// ── Monthly file detail (with nested items) ───────────────────────────────────
export function useMonthlyFileDetail(id: number | null) {
  return useQuery<MonthlyWarehouseCostDetail>({
    queryKey: warehouseCostKeys.detail(id!),
    queryFn: () => apiFetch(`${getApiBase()}/warehouse-costs/monthly/${id}/`),
    enabled: id !== null,
    staleTime: 20_000,
  });
}

// ── Create monthly file ───────────────────────────────────────────────────────
export function useCreateMonthlyFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MonthlyFileFormData) =>
      apiFetch(`${getApiBase()}/warehouse-costs/monthly/`, {
        method: "POST",
        body: JSON.stringify({ year: parseInt(data.year), month: parseInt(data.month) }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: warehouseCostKeys.all() }),
  });
}

// ── Delete monthly file ───────────────────────────────────────────────────────
export function useDeleteMonthlyFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${getApiBase()}/warehouse-costs/monthly/${id}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: warehouseCostKeys.all() }),
  });
}

// ── Create cost item ──────────────────────────────────────────────────────────
export function useCreateCostItem(monthId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: WarehouseCostFormData) =>
      apiFetch(`${getApiBase()}/warehouse-costs/items/`, {
        method: "POST",
        body: JSON.stringify({
          month: monthId,
          cost_type: data.cost_type,
          date: data.date || null,
          amount: data.amount ? String(parseFloat(data.amount).toFixed(4)) : null,
          notes: data.notes || null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: warehouseCostKeys.detail(monthId) });
      qc.invalidateQueries({ queryKey: warehouseCostKeys.all() });
    },
  });
}

// ── Update cost item ──────────────────────────────────────────────────────────
export function useUpdateCostItem(monthId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: WarehouseCostFormData }) =>
      apiFetch(`${getApiBase()}/warehouse-costs/items/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          cost_type: data.cost_type,
          date: data.date || null,
          amount: data.amount ? String(parseFloat(data.amount).toFixed(4)) : null,
          notes: data.notes || null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: warehouseCostKeys.detail(monthId) });
      qc.invalidateQueries({ queryKey: warehouseCostKeys.all() });
    },
  });
}

// ── Delete cost item ──────────────────────────────────────────────────────────
export function useDeleteCostItem(monthId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${getApiBase()}/warehouse-costs/items/${id}/`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: warehouseCostKeys.detail(monthId) });
      qc.invalidateQueries({ queryKey: warehouseCostKeys.all() });
    },
  });
}