"use client";

import Link from "next/link";
import { Sale } from "@/types/sale";
import { Pagination } from "@/components/inventory/pagination";
import { TableLoader } from "@/components/inventory/ui-primitives";
import { cn } from "@/lib/utils";
import { usd as money } from "@/lib/format-number";
import { StatusBadge } from "./status";

type Props = {
  sales: Sale[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  onPageChange: (p: number) => void;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function PaymentStatus({ s }: { s: Sale }) {
  const due = Number(s.payment_due);
  const paid = Number(s.payment);
  const total = Number(s.total);
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const [label, style] =
    due <= 0
      ? ["Paid", "bg-emerald-50 text-emerald-700"]
      : paid > 0
        ? ["Partial", "bg-amber-50 text-amber-700"]
        : ["Unpaid", "bg-red-50 text-red-700"];

  return (
    <div className="min-w-[140px]">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("badge", style)}>{label}</span>
        {due > 0 && <span className="text-xs font-medium tabular-nums text-amber-700">{money(due)} due</span>}
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-[11px] tabular-nums text-slate-400">{money(paid)} paid</div>
    </div>
  );
}

const HEADERS: [string, string][] = [
  ["Order / Store", "text-left"],
  ["Date", "text-left"],
  ["Status", "text-left"],
  ["Cartons", "text-right"],
  ["Total", "text-right"],
  ["Profit", "text-right"],
  ["Payment", "text-left"],
];

export default function SaleTable({ sales, total, page, pageSize, loading = false, onPageChange }: Props) {
  const pages = Math.ceil(total / pageSize);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80">
            <tr>
              {HEADERS.map(([h, align]) => (
                <th
                  key={h}
                  className={cn("whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500", align)}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <TableLoader colSpan={HEADERS.length} message="Loading sales..." />}
            {!loading && sales.length === 0 && (
              <tr>
                <td colSpan={HEADERS.length} className="py-16 text-center">
                  <p className="text-sm text-slate-500">No sales found</p>
                  <Link href="/sales/new" className="mt-2 inline-block text-sm font-medium text-indigo-600">
                    Create your first sale →
                  </Link>
                </td>
              </tr>
            )}
            {!loading &&
              sales.map((s) => {
                const profit = Number(s.profit);
                const sTotal = Number(s.total);
                return (
                  <tr key={s.id} className="group transition-colors hover:bg-indigo-50/40">
                    <td className="px-4 py-3">
                      <Link href={`/sales/${s.id}`} className="block">
                        <span className="font-mono text-xs font-semibold text-indigo-700 group-hover:underline">
                          {s.order_no}
                        </span>
                        <span className="mt-0.5 block font-medium text-slate-800">{s.store_name}</span>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="text-slate-700">{formatDate(s.date)}</div>
                      <div className="text-xs text-slate-400">
                        {s.delivery_date ? `Delivery ${formatDate(s.delivery_date)}` : "No delivery date"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{s.total_carton}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                      {money(s.total)}
                      {Number(s.discount) > 0 && (
                        <div className="text-[11px] font-normal text-slate-400">{money(s.discount)} discount</div>
                      )}
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-4 py-3 text-right tabular-nums",
                        profit < 0 ? "text-red-600" : "text-emerald-600",
                      )}
                    >
                      {money(profit)}
                      {sTotal > 0 && (
                        <div className="text-[11px] text-slate-400">{((profit / sTotal) * 100).toFixed(1)}%</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PaymentStatus s={s} />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} onChange={onPageChange} />
    </div>
  );
}
