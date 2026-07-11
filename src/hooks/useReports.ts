import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { MonthlyReport, YearlyReport } from "@/types/report";

export const reportKeys = {
  all: () => ["reports"] as const,
  monthly: (year: string) => ["reports", "monthly", year] as const,
  yearly: () => ["reports", "yearly"] as const,
};

export function useMonthlyReports(year: string, enabled = true) {
  return useQuery<{ results: MonthlyReport[]; count: number }>({
    queryKey: reportKeys.monthly(year),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (year) params.set("year", year);
      const data = await apiFetch(`${getApiBase()}/reports/monthly/?${params}`);
      return { results: data.results ?? data, count: data.count ?? data.length };
    },
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useYearlyReports(enabled = true) {
  return useQuery<YearlyReport[]>({
    queryKey: reportKeys.yearly(),
    queryFn: async () => {
      const data = await apiFetch(`${getApiBase()}/reports/yearly/`);
      return data.results ?? data;
    },
    enabled,
    staleTime: 60_000,
  });
}
