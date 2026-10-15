"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/inventory/kpi-card";
import { PageHeader, SearchInput } from "@/components/inventory/ui-primitives";
import PurchaseTable from "@/components/Purchases/PurchaseTable";
import { AsyncSelect } from "@/components/Purchases/AsyncSelect";
import { usd as money } from "@/lib/format-number";
import { usePurchases } from "@/hooks/usePurchases";
import { VendorOption } from "@/types/purchase";

const PAGE_SIZE = 20;

const DATE_RANGES = [
  { key: "", label: "Any date" },
  { key: "today", label: "Today" },
  { key: "past_7_days", label: "Past 7 days" },
  { key: "this_month", label: "This month" },
  { key: "this_year", label: "This year" },
];

const loadVendors = async (q: string): Promise<VendorOption[]> => {
  const res = await apiFetch(`${getApiBase()}/vendors/autocomplete/?q=${encodeURIComponent(q)}`);
  return res.results ?? res;
};

export default function PurchasesPage() {
  const [search, setSearch] = useState("");
  const [vendor, setVendor] = useState({ id: "", name: "" });
  const [dateRange, setDateRange] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePurchases({ search, page, vendor: vendor.id, dateRange });
  const summary = data?.summary;
  const count = data?.count ?? 0;
  const filtered = !!(search || vendor.id || dateRange);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase orders"
        description="Track vendor purchases, landed costs and payments by lot."
        actions={
          <Link href="/purchases/new" className="btn-primary">
            <span className="text-lg leading-none">+</span> New purchase
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Purchases"
          value={count}
          sub={`${(summary?.total_carton ?? 0).toLocaleString()} cartons`}
          accent="primary"
        />
        <KpiCard
          label="Total purchase cost"
          value={money(summary?.total_purchase_cost ?? 0)}
          sub={`${money(summary?.total_product_price ?? 0)} products`}
          accent="blue"
        />
        <KpiCard label="Paid to vendors" value={money(summary?.payment ?? 0)} accent="green" />
        <KpiCard label="Payment due" value={money(summary?.payment_due ?? 0)} accent="amber" />
      </div>

      <div className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchInput
            className="sm:w-64"
            placeholder="Search lot or vendor..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <div className="flex gap-2">
            <AsyncSelect<VendorOption>
              className="sm:w-56"
              value={vendor}
              placeholder="All vendors"
              loadOptions={loadVendors}
              onSelect={(v) => {
                setVendor({ id: String(v.id), name: v.name });
                setPage(1);
              }}
            />
            {vendor.id && (
              <button
                type="button"
                onClick={() => {
                  setVendor({ id: "", name: "" });
                  setPage(1);
                }}
                className="btn-secondary px-3"
                aria-label="Clear vendor filter"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100/80 p-1">
          {DATE_RANGES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setDateRange(key);
                setPage(1);
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                dateRange === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered && (
        <p className="-mt-3 text-xs text-slate-500">
          Showing {count} purchase{count === 1 ? "" : "s"} matching your filters. Totals above reflect the filter.
        </p>
      )}

      <PurchaseTable
        purchases={data?.results ?? []}
        total={count}
        page={page}
        pageSize={PAGE_SIZE}
        loading={isLoading && !data}
        onPageChange={setPage}
      />
    </div>
  );
}
