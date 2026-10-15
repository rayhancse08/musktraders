"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/inventory/kpi-card";
import { PageHeader, SearchInput } from "@/components/inventory/ui-primitives";
import { AsyncSelect } from "@/components/inventory/async-select";
import SaleTable from "@/components/Sales/SaleTable";
import { usd as money } from "@/lib/format-number";
import { SALE_STATUSES } from "@/lib/sale-math";
import { useSales } from "@/hooks/useSales";
import { StoreOption } from "@/types/sale";

const PAGE_SIZE = 20;

const DATE_RANGES = [
  { key: "", label: "Any date" },
  { key: "today", label: "Today" },
  { key: "past_7_days", label: "Past 7 days" },
  { key: "this_month", label: "This month" },
  { key: "this_year", label: "This year" },
];

const STATUS_FILTERS = [{ key: "", label: "All" }, ...SALE_STATUSES];

const loadStores = async (q: string): Promise<StoreOption[]> => {
  const res = await apiFetch(`${getApiBase()}/stores/autocomplete/?q=${encodeURIComponent(q)}`);
  return res.results ?? res;
};

function Chips<T extends string>({
  options, value, onChange,
}: {
  options: readonly { key: T | ""; label: string }[];
  value: string;
  onChange: (key: T | "") => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100/80 p-1">
      {options.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition",
            value === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function SalesPage() {
  const [search, setSearch] = useState("");
  const [store, setStore] = useState({ id: "", name: "" });
  const [status, setStatus] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSales({ search, status, store: store.id, dateRange, page });
  const summary = data?.summary;
  const count = data?.count ?? 0;
  const filtered = !!(search || store.id || status || dateRange);
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales orders"
        description="Orders to stores, profit per lot, deliveries and payments."
        actions={
          <Link href="/sales/new" className="btn-primary">
            <span className="text-lg leading-none">+</span> New sale
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Sales value"
          value={money(summary?.total ?? 0)}
          sub={`${count} order${count === 1 ? "" : "s"} · ${(summary?.total_carton ?? 0).toLocaleString()} ctn`}
          accent="primary"
        />
        <KpiCard label="Profit" value={money(summary?.profit ?? 0)} accent="blue" />
        <KpiCard label="Received" value={money(summary?.payment ?? 0)} accent="green" />
        <KpiCard label="Payment due" value={money(summary?.payment_due ?? 0)} accent="amber" />
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchInput
              className="sm:w-64"
              placeholder="Search order no or store..."
              value={search}
              onChange={(e) => reset(setSearch)(e.target.value)}
            />
            <div className="flex gap-2">
              <AsyncSelect<StoreOption>
                className="sm:w-56"
                value={store}
                placeholder="All stores"
                loadOptions={loadStores}
                onSelect={(s) => reset(setStore)({ id: String(s.id), name: s.name })}
              />
              {store.id && (
                <button
                  type="button"
                  onClick={() => reset(setStore)({ id: "", name: "" })}
                  className="btn-secondary px-3"
                  aria-label="Clear store filter"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <Chips options={DATE_RANGES} value={dateRange} onChange={reset(setDateRange)} />
        </div>
        <Chips options={STATUS_FILTERS} value={status} onChange={reset(setStatus)} />
      </div>

      {filtered && (
        <p className="-mt-3 text-xs text-slate-500">
          Showing {count} sale{count === 1 ? "" : "s"} matching your filters. Totals above reflect the filter.
        </p>
      )}

      <SaleTable
        sales={data?.results ?? []}
        total={count}
        page={page}
        pageSize={PAGE_SIZE}
        loading={isLoading && !data}
        onPageChange={setPage}
      />
    </div>
  );
}
