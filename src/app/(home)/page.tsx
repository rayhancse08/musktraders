"use client";

import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  BarChart3,
} from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { KpiCard } from "@/components/inventory/kpi-card";
import { PageHeader, SecondaryButton } from "@/components/inventory/ui-primitives";
import { RevenueChartPoint, TopProduct, RecentSale } from "@/types/dashboard";

const fmt = (v: number) =>
  "$" + v.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = (v: number) =>
  v >= 1_000_000
    ? "$" + (v / 1_000_000).toFixed(1) + "M"
    : v >= 1_000
      ? "$" + (v / 1_000).toFixed(1) + "K"
      : fmt(v);

const MONTH_SHORT = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-indigo-50 text-indigo-700",
  packing: "bg-violet-50 text-violet-700",
  delivering: "bg-amber-50 text-amber-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

function BarChart({ data }: { data: RevenueChartPoint[] }) {
  const maxVal = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="flex h-40 w-full items-end gap-2">
      {data.map((d, i) => {
        const revH = Math.max((d.revenue / maxVal) * 100, 2);
        const profH = Math.max((Math.max(d.profit, 0) / maxVal) * 100, 0);
        return (
          <div key={i} className="group relative flex flex-1 flex-col items-center gap-1">
            <div className="pointer-events-none absolute bottom-full z-10 mb-2 hidden flex-col items-center group-hover:flex">
              <div className="whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
                <p className="font-medium">{MONTH_SHORT[d.month]} {d.year}</p>
                <p className="text-emerald-400">Rev: {fmtK(d.revenue)}</p>
                <p className="text-indigo-300">Profit: {fmtK(d.profit)}</p>
              </div>
            </div>
            <div className="flex w-full items-end gap-1" style={{ height: "140px" }}>
              <div
                className="flex-1 rounded-t-md bg-indigo-400 transition-all group-hover:bg-indigo-500"
                style={{ height: `${revH}%` }}
              />
              <div
                className="flex-1 rounded-t-md bg-emerald-400 transition-all group-hover:bg-emerald-500"
                style={{ height: `${profH}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-slate-400">{MONTH_SHORT[d.month]}</span>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const colors: Record<string, string> = {
    confirmed: "#6366f1", packing: "#8b5cf6",
    delivering: "#f59e0b", delivered: "#10b981", cancelled: "#ef4444",
  };
  let offset = 0;
  const R = 36, cx = 44, cy = 44, stroke = 14;
  const circ = 2 * Math.PI * R;
  const slices = Object.entries(data).map(([status, cnt]) => {
    const pct = total > 0 ? cnt / total : 0;
    const dash = pct * circ;
    const s = { status, cnt, pct, dash, offset: offset * circ };
    offset += pct;
    return s;
  });
  return (
    <div className="flex items-center gap-6">
      <svg width="88" height="88" className="flex-shrink-0">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {slices.map(({ status, dash, offset: off }) => (
          <circle
            key={status}
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke={colors[status] ?? "#94a3b8"}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-off + circ / 4}
          />
        ))}
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="600" fill="#0f172a">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#94a3b8">orders</text>
      </svg>
      <div className="space-y-2">
        {slices.map(({ status, cnt, pct }) => (
          <div key={status} className="flex items-center gap-2 text-xs">
            <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: colors[status] ?? "#94a3b8" }} />
            <span className="w-20 capitalize text-slate-600">{status}</span>
            <span className="font-semibold text-slate-800">{cnt}</span>
            <span className="text-slate-400">({(pct * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanProgress({ label, pct, color, value, target }: { label: string; pct: number; color: string; value: number; target: number }) {
  const over = pct > 100;
  const clamped = Math.min(pct, 100);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <div className="text-right">
          <span className={`text-sm font-bold ${over ? "text-red-600" : "text-slate-800"}`}>{pct.toFixed(1)}%</span>
          <span className="ml-1 text-xs text-slate-400">{fmtK(value)} / {fmtK(target)}</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-2 rounded-full transition-all duration-700 ${over ? "bg-red-400" : color}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

function TopProductsChart({ data }: { data: TopProduct[] }) {
  const max = Math.max(...data.map((d) => d.total_qty), 1);
  return (
    <div className="space-y-4">
      {data.map((d, i) => (
        <div key={i}>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="max-w-[60%] truncate font-medium text-slate-700">{d.product_name}</span>
            <span className="font-mono text-slate-500">{d.total_qty} ctn · {fmtK(d.total_revenue)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-indigo-400 transition-all duration-700"
              style={{ width: `${(d.total_qty / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, inventory, monthly_plan: plan, revenue_chart, top_products, sale_status_breakdown, recent_sales, meta } = data;
  const growthPositive = kpis.revenue_growth_pct >= 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`${MONTH_SHORT[meta.this_month]} ${meta.this_year} · Today: ${meta.today}`}
        actions={
          <SecondaryButton onClick={() => refetch()} disabled={isFetching} className="h-9 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Refreshing..." : `Updated ${new Date(dataUpdatedAt).toLocaleTimeString("en-BD")}`}
          </SecondaryButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Today's Revenue"
          value={fmtK(kpis.today_revenue)}
          sub="Sales confirmed today"
          accent="blue"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KpiCard
          label="Monthly Revenue"
          value={fmtK(kpis.monthly_revenue)}
          sub={
            <span className={`flex items-center gap-1 ${growthPositive ? "text-emerald-600" : "text-red-500"}`}>
              <TrendingUp className={`h-3 w-3 ${!growthPositive ? "rotate-180" : ""}`} />
              {Math.abs(kpis.revenue_growth_pct)}% vs last month
            </span>
          }
          accent="green"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          label="Monthly Profit"
          value={fmtK(kpis.monthly_profit)}
          sub={`After ৳${(kpis.monthly_wh_cost / 1000).toFixed(1)}K costs`}
          accent="indigo"
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <KpiCard
          label="Total Sale Due"
          value={fmtK(kpis.total_sale_due)}
          sub={`Purchase due: ${fmtK(kpis.purchase_due)}`}
          accent="amber"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Monthly Purchase", value: fmtK(kpis.monthly_purchase_cost), accent: "primary" as const },
          { label: "Warehouse Costs", value: fmtK(kpis.monthly_wh_cost), accent: "amber" as const },
          { label: "Returns (packets)", value: kpis.monthly_returns.toString(), accent: "amber" as const },
          { label: "Damage Value", value: fmtK(kpis.monthly_damage_value), accent: "red" as const },
        ].map(({ label, value, accent }) => (
          <KpiCard key={label} label={label} value={value} accent={accent} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div>
              <h3 className="font-semibold text-slate-900">Revenue vs Profit</h3>
              <p className="text-xs text-slate-500">Last 12 months</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="h-2 w-3 rounded-sm bg-indigo-400" />
                Revenue
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="h-2 w-3 rounded-sm bg-emerald-400" />
                Profit
              </div>
            </div>
          </div>
          <div className="card-body">
            <BarChart data={revenue_chart} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900">Inventory</h3>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Products", value: inventory.total_products, color: "text-slate-800" },
                { label: "Out of Stock", value: inventory.out_of_stock, color: "text-red-600" },
                { label: "Low Stock", value: inventory.low_stock, color: "text-amber-600" },
                { label: "Stock Value", value: fmtK(inventory.total_stock_value), color: "text-indigo-700" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`text-lg font-semibold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">Stock Health</p>
              <div className="flex h-2.5 overflow-hidden rounded-full">
                {inventory.total_products > 0 && (
                  <>
                    <div className="h-full bg-emerald-400" style={{ width: `${((inventory.total_products - inventory.low_stock - inventory.out_of_stock) / inventory.total_products) * 100}%` }} />
                    <div className="h-full bg-amber-400" style={{ width: `${(inventory.low_stock / inventory.total_products) * 100}%` }} />
                    <div className="h-full bg-red-400" style={{ width: `${(inventory.out_of_stock / inventory.total_products) * 100}%` }} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900">Monthly Plan</h3>
            {!plan.has_plan && <span className="badge bg-amber-50 text-amber-700">No plan set</span>}
          </div>
          <div className="card-body">
            {plan.has_plan ? (
              <div className="space-y-4">
                <PlanProgress label="Sales Achievement" pct={plan.achievement_pct} color="bg-indigo-400" value={plan.sales_achieve} target={plan.sales_target} />
                <PlanProgress label="Budget Usage" pct={plan.budget_pct} color="bg-amber-400" value={plan.spent} target={plan.budget} />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="font-mono text-lg font-semibold text-indigo-700">{fmtK(kpis.monthly_revenue)}</p>
                <Link href="/plans" className="btn-secondary w-full text-center text-xs">
                  Set Monthly Plan
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900">Order Status</h3>
          </div>
          <div className="card-body">
            {Object.keys(sale_status_breakdown).length > 0
              ? <DonutChart data={sale_status_breakdown} />
              : <p className="text-sm text-slate-400">No orders this year</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900">Top Products</h3>
          </div>
          <div className="card-body">
            {top_products.length > 0
              ? <TopProductsChart data={top_products} />
              : <p className="text-sm text-slate-400">No sales data</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900">Quick Access</h3>
          </div>
          <div className="card-body space-y-1">
            {[
              { href: "/sales", label: "New Sale", icon: Package },
              { href: "/purchases", label: "New Purchase", icon: Package },
              { href: "/warehouse", label: "Warehouse", icon: Package },
              { href: "/report", label: "Reports", icon: BarChart3 },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
              >
                <Icon className="h-4 w-4 text-slate-400" />
                {label}
                <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-slate-300" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header">
          <div>
            <h3 className="font-semibold text-slate-900">Recent Sales</h3>
            <p className="text-xs text-slate-500">Last 8 orders</p>
          </div>
          <Link href="/sales" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="table-modern w-full">
            <thead>
              <tr>
                {["Order", "Store", "Date", "Status", "Total", "Due", ""].map((h) => (
                  <th key={h} className={["Total", "Due"].includes(h) ? "text-right" : ""}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent_sales.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">No recent sales</td></tr>
              )}
              {recent_sales.map((s: RecentSale) => (
                <tr key={s.id} className="group">
                  <td className="font-mono text-xs text-slate-500">{s.order_no}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
                        {s.store_name?.[0]}
                      </div>
                      <span className="text-sm font-medium text-slate-800">{s.store_name}</span>
                    </div>
                  </td>
                  <td className="text-slate-500">{s.date}</td>
                  <td>
                    <span className={`badge ${STATUS_STYLE[s.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="text-right font-mono font-semibold text-slate-800">{fmt(s.total)}</td>
                  <td className="text-right font-mono text-xs">
                    {s.payment_due > 0
                      ? <span className="text-amber-600">{fmt(s.payment_due)}</span>
                      : <span className="text-emerald-500">✓</span>}
                  </td>
                  <td>
                    <Link
                      href={`/sales/${s.id}`}
                      className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 opacity-0 transition group-hover:opacity-100 hover:bg-indigo-100"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
