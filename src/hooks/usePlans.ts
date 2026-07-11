import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import {
  MonthlyPlan, YearlyPlan,
  MonthlyPlanFormData, YearlyPlanFormData,
} from "@/types/plan";

const d4 = (v: string) => v ? String(parseFloat(v).toFixed(4)) : null;

export const planKeys = {
  monthly:       (year?: string) => ["plans", "monthly", year] as const,
  yearly:        ()              => ["plans", "yearly"]         as const,
  monthlyDetail: (id: number)   => ["plans", "monthly", id]   as const,
};

// ── Monthly plan list ─────────────────────────────────────────────────────
export function useMonthlyPlans(year: string) {
  return useQuery<MonthlyPlan[]>({
    queryKey: planKeys.monthly(year),
    queryFn: async () => {
      const data = await apiFetch(`${getApiBase()}/plans/monthly/?year=${year}`);
      return data.results ?? data;
    },
    staleTime: 20_000,
  });
}

// ── Yearly plan list ──────────────────────────────────────────────────────
export function useYearlyPlans() {
  return useQuery<YearlyPlan[]>({
    queryKey: planKeys.yearly(),
    queryFn: async () => {
      const data = await apiFetch(`${getApiBase()}/plans/yearly/`);
      return data.results ?? data;
    },
    staleTime: 20_000,
  });
}

// ── Create monthly plan ───────────────────────────────────────────────────
export function useCreateMonthlyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: MonthlyPlanFormData) =>
      apiFetch(`${getApiBase()}/plans/monthly/`, {
        method: "POST",
        body: JSON.stringify({
          year:         parseInt(form.year),
          month:        parseInt(form.month),
          sales_target: d4(form.sales_target),
          budget:       d4(form.budget),
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans", "monthly"] }),
  });
}

// ── Update monthly plan ───────────────────────────────────────────────────
export function useUpdateMonthlyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }: { id: number; form: MonthlyPlanFormData }) =>
      apiFetch(`${getApiBase()}/plans/monthly/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          sales_target: d4(form.sales_target),
          budget:       d4(form.budget),
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans", "monthly"] }),
  });
}

// ── Recalculate monthly plan ──────────────────────────────────────────────
export function useRecalculateMonthlyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${getApiBase()}/plans/monthly/${id}/recalculate/`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans", "monthly"] }),
  });
}

// ── Delete monthly plan ───────────────────────────────────────────────────
export function useDeleteMonthlyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${getApiBase()}/plans/monthly/${id}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans", "monthly"] }),
  });
}

// ── Create yearly plan ────────────────────────────────────────────────────
export function useCreateYearlyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: YearlyPlanFormData) =>
      apiFetch(`${getApiBase()}/plans/yearly/`, {
        method: "POST",
        body: JSON.stringify({
          year:         parseInt(form.year),
          sales_target: d4(form.sales_target),
          budget:       d4(form.budget),
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.yearly() }),
  });
}

// ── Update yearly plan ────────────────────────────────────────────────────
export function useUpdateYearlyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }: { id: number; form: YearlyPlanFormData }) =>
      apiFetch(`${getApiBase()}/plans/yearly/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          sales_target: d4(form.sales_target),
          budget:       d4(form.budget),
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.yearly() }),
  });
}

// ── Recalculate yearly plan ───────────────────────────────────────────────
export function useRecalculateYearlyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${getApiBase()}/plans/yearly/${id}/recalculate/`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.yearly() }),
  });
}

// ── Delete yearly plan ────────────────────────────────────────────────────
export function useDeleteYearlyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${getApiBase()}/plans/yearly/${id}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.yearly() }),
  });
}