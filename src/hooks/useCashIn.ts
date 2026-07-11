import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { CashInCategory, MonthlyCashInFile } from "@/types/cashin";
import { TaxCompany } from "@/types/tax";

export const cashInKeys = {
  all: () => ["cashin"] as const,
  categories: () => ["cashin", "categories"] as const,
  categoryList: (search?: string) => ["cashin", "categories", search ?? ""] as const,
  files: (year: string) => ["cashin", "files", year] as const,
  companies: () => ["tax", "companies"] as const,
};

export function useCashInCategories(search: string, enabled = true) {
  return useQuery<CashInCategory[]>({
    queryKey: cashInKeys.categoryList(search),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const data = await apiFetch(`${getApiBase()}/cashin/categories/?${params}`);
      return data.results ?? data;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useCashInCompanies(enabled = true) {
  return useQuery<TaxCompany[]>({
    queryKey: cashInKeys.companies(),
    queryFn: async () => {
      const data = await apiFetch(`${getApiBase()}/tax/companies/`);
      return data.results ?? data;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useCashInMonthlyFiles(year: string, enabled = true) {
  return useQuery<{ results: MonthlyCashInFile[]; count: number }>({
    queryKey: cashInKeys.files(year),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (year) params.set("year", year);
      const data = await apiFetch(`${getApiBase()}/cashin/monthly-files/?${params}`);
      return { results: data.results ?? data, count: data.count ?? data.length };
    },
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
