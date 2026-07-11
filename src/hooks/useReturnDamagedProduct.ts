import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { ReturnProduct, DamageProduct, ReturnProductFormData, DamageProductFormData } from "@/types/returnDamage";

// ── Query keys ─────────────────────────────────────────────────────────────
export const returnDamageKeys = {
  returns:       (params?: Record<string, string>) => ["return-products", params]  as const,
  damages:       (params?: Record<string, string>) => ["damage-products", params]  as const,
  returnDetail:  (id: number) => ["return-products", "detail", id] as const,
  damageDetail:  (id: number) => ["damage-products", "detail", id] as const,
};

// ── Return products list ───────────────────────────────────────────────────
export function useReturnProducts(params: Record<string, string> = {}) {
  return useQuery<{ results: ReturnProduct[]; count: number }>({
    queryKey: returnDamageKeys.returns(params),
    queryFn: async () => {
      const p = new URLSearchParams(params);
      const data = await apiFetch(`${getApiBase()}/return-products/?${p}`);
      return { results: data.results ?? data, count: data.count ?? data.length };
    },
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  });
}

// ── Damage products list ───────────────────────────────────────────────────
export function useDamageProducts(params: Record<string, string> = {}) {
  return useQuery<{ results: DamageProduct[]; count: number }>({
    queryKey: returnDamageKeys.damages(params),
    queryFn: async () => {
      const p = new URLSearchParams(params);
      const data = await apiFetch(`${getApiBase()}/damage-products/?${p}`);
      return { results: data.results ?? data, count: data.count ?? data.length };
    },
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  });
}

// ── Create return product ──────────────────────────────────────────────────
export function useCreateReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ReturnProductFormData) =>
      apiFetch(`${getApiBase()}/return-products/`, {
        method: "POST",
        body: JSON.stringify({
          product:    data.product,
          date:       data.date,
          lot_number: data.lot_number || null,
          quantity:   parseInt(data.quantity),
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["return-products"] }),
  });
}

// ── Update return product ──────────────────────────────────────────────────
export function useUpdateReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReturnProductFormData }) =>
      apiFetch(`${getApiBase()}/return-products/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          product:    data.product,
          date:       data.date,
          lot_number: data.lot_number || null,
          quantity:   parseInt(data.quantity),
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["return-products"] }),
  });
}

// ── Delete return product ──────────────────────────────────────────────────
export function useDeleteReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${getApiBase()}/return-products/${id}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["return-products"] }),
  });
}

// ── Create damage product ──────────────────────────────────────────────────
export function useCreateDamage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DamageProductFormData) =>
      apiFetch(`${getApiBase()}/damage-products/`, {
        method: "POST",
        body: JSON.stringify({
          product:  data.product,
          date:     data.date,
          quantity: parseInt(data.quantity),
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["damage-products"] }),
  });
}

// ── Update damage product ──────────────────────────────────────────────────
export function useUpdateDamage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DamageProductFormData }) =>
      apiFetch(`${getApiBase()}/damage-products/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          product:  data.product,
          date:     data.date,
          quantity: parseInt(data.quantity),
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["damage-products"] }),
  });
}

// ── Delete damage product ──────────────────────────────────────────────────
export function useDeleteDamage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${getApiBase()}/damage-products/${id}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["damage-products"] }),
  });
}