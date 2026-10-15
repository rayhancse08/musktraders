"use client";

import Link from "next/link";
import { Purchase } from "@/types/purchase";
import { Pagination } from "@/components/inventory/pagination";
import { TableLoader } from "@/components/inventory/ui-primitives";
import { PURCHASE_COST_FIELDS } from "@/lib/purchase-math";
import { cn } from "@/lib/utils";
import { usd as money } from "@/lib/format-number";

type Props = {
  purchases: Purchase[];
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

function PaymentStatus({ p }: { p: Purchase }) {
  const due = Number(p.payment_due);
  const paid = Number(p.payment);
  const product = Number(p.total_product_price);
  const pct = product > 0 ? Math.min(100, (paid / product) * 100) : 0;
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
  ["Lot / Vendor", "text-left"],
  ["Date", "text-left"],
  ["Cartons", "text-right"],
  ["Product price", "text-right"],
  ["Additional costs", "text-right"],
  ["Total purchase cost", "text-right"],
  ["Payment", "text-left"],
];

export default function PurchaseTable({ purchases, total, page, pageSize, loading = false, onPageChange }: Props) {
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
            {loading && <TableLoader colSpan={HEADERS.length} message="Loading purchases..." />}
            {!loading && purchases.length === 0 && (
              <tr>
                <td colSpan={HEADERS.length} className="py-16 text-center">
                  <p className="text-sm text-slate-500">No purchases found</p>
                  <Link href="/purchases/new" className="mt-2 inline-block text-sm font-medium text-indigo-600">
                    Create your first purchase →
                  </Link>
                </td>
              </tr>
            )}
            {!loading &&
              purchases.map((p) => (
                <tr key={p.id} className="group transition-colors hover:bg-indigo-50/40">
                  <td className="px-4 py-3">
                    <Link href={`/purchases/${p.id}`} className="block">
                      <span className="font-mono text-xs font-semibold text-indigo-700 group-hover:underline">
                        {p.lot_number}
                      </span>
                      <span className="mt-0.5 block font-medium text-slate-800">{p.vendor_name ?? "—"}</span>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="text-slate-700">{formatDate(p.date)}</div>
                    <div className="text-xs text-slate-400">
                      {p.receive_date ? `Received ${formatDate(p.receive_date)}` : "Not received"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{p.total_carton}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                    {money(p.total_product_price)}
                  </td>
                  <td
                    className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-500"
                    title={PURCHASE_COST_FIELDS.map(({ key, label }) => `${label}: ${money(p[key])}`).join("\n")}
                  >
                    <span className="cursor-help border-b border-dotted border-slate-300">{money(p.additional_cost)}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                    {money(p.total_purchase_cost)}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatus p={p} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} onChange={onPageChange} />
    </div>
  );
}
