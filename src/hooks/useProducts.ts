import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import {
  Product, ProductDetail, ProductCategory,
  ProductFormData, ProductCategoryFormData,
} from "@/types/product";

import { apiPath } from "@/lib/api-config";

export const productKeys = {
  all:           ()                         => ["products"]                       as const,
  list:          (params: Record<string, string>) => ["products", "list", params] as const,
  detail:        (id: number)               => ["products", "detail", id]         as const,
  categories:    (params?: Record<string, string>) => ["product-categories", params] as const,
  categoryDetail:(id: number)               => ["product-categories", id]         as const,
};

// ── Products list ─────────────────────────────────────────────────────────
export function useProducts(params: Record<string, string> = {}) {
  return useQuery<{ results: Product[]; count: number }>({
    queryKey: productKeys.list(params),
    queryFn: async () => {
      const p = new URLSearchParams(params);
      const data = await apiFetch(`${apiPath("products")}?${p}`);
      return { results: data.results ?? data, count: data.count ?? data.length };
    },
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  });
}

// ── Product detail ────────────────────────────────────────────────────────
export function useProductDetail(id: number | null) {
  return useQuery<ProductDetail>({
    queryKey: productKeys.detail(id!),
    queryFn: () => apiFetch(apiPath(`products/${id}`)),
    enabled: id !== null,
    staleTime: 20_000,
  });
}

// ── Create product (multipart/form-data for image) ────────────────────────
export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: ProductFormData) => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v === null || v === undefined) return;
        if (k === "image" && v instanceof File) fd.append(k, v);
        else fd.append(k, String(v));
      });
      return apiFetch(apiPath("products"), { method: "POST", body: fd });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all() }),
  });
}

// ── Update product ────────────────────────────────────────────────────────
export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }: { id: number; form: Partial<ProductFormData> }) => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v === null || v === undefined) return;
        if (k === "image" && v instanceof File) fd.append(k, v);
        else fd.append(k, String(v));
      });
      return apiFetch(apiPath(`products/${id}`), { method: "PATCH", body: fd });
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: productKeys.all() });
      qc.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}

// ── Delete product ────────────────────────────────────────────────────────
export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(apiPath(`products/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all() }),
  });
}

// ── Recalculate product ───────────────────────────────────────────────────
export function useRecalculateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(apiPath(`products/${id}/recalculate`), { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: productKeys.all() });
      qc.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}

// ── Categories list ───────────────────────────────────────────────────────
export function useProductCategories(params: Record<string, string> = {}) {
  return useQuery<ProductCategory[]>({
    queryKey: productKeys.categories(params),
    queryFn: async () => {
      const p = new URLSearchParams(params);
      const data = await apiFetch(`${apiPath("product-categories")}?${p}`);
      return data.results ?? data;
    },
    staleTime: 60_000,
  });
}

// ── Create category (multipart for image) ─────────────────────────────────
export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: ProductCategoryFormData) => {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("is_featured", String(form.is_featured));
      if (form.image) fd.append("image", form.image);
      return apiFetch(apiPath("product-categories"), { method: "POST", body: fd });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-categories"] }),
  });
}

// ── Update category ───────────────────────────────────────────────────────
export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }: { id: number; form: Partial<ProductCategoryFormData> }) => {
      const fd = new FormData();
      if (form.name !== undefined) fd.append("name", form.name);
      if (form.is_featured !== undefined) fd.append("is_featured", String(form.is_featured));
      if (form.image instanceof File) fd.append("image", form.image);
      return apiFetch(apiPath(`product-categories/${id}`), { method: "PATCH", body: fd });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-categories"] }),
  });
}

// ── Delete category ───────────────────────────────────────────────────────
export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(apiPath(`product-categories/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-categories"] }),
  });
}