import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { TaxCategory, TaxCompany, MonthlyTaxFile } from "@/types/tax";

export const taxKeys = {
  all: () => ["tax"] as const,
  categories: () => ["tax", "categories"] as const,
  categoryList: (search?: string) => ["tax", "categories", search ?? ""] as const,
  companies: () => ["tax", "companies"] as const,
  companyList: (search?: string) => ["tax", "companies", search ?? ""] as const,
  files: (year: string) => ["tax", "files", year] as const,
};

export function useTaxCategories(search: string, enabled = true) {
  return useQuery<TaxCategory[]>({
    queryKey: taxKeys.categoryList(search),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const data = await apiFetch(`${getApiBase()}/tax/categories/?${params}`);
      return data.results ?? data;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useTaxCompanies(search: string, enabled = true) {
  return useQuery<TaxCompany[]>({
    queryKey: taxKeys.companyList(search),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const data = await apiFetch(`${getApiBase()}/tax/companies/?${params}`);
      return data.results ?? data;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useTaxMonthlyFiles(year: string, enabled = true) {
  return useQuery<{ results: MonthlyTaxFile[]; count: number }>({
    queryKey: taxKeys.files(year),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (year) params.set("year", year);
      const data = await apiFetch(`${getApiBase()}/tax/monthly-files/?${params}`);
      return { results: data.results ?? data, count: data.count ?? data.length };
    },
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
