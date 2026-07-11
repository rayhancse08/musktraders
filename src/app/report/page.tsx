"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { MonthlyReport, YearlyReport, MONTHS } from "@/types/report";
import { reportKeys, useMonthlyReports, useYearlyReports } from "@/hooks/useReports";

const fmt = (v: string | null | undefined) =>
  v ? "$" + parseFloat(v).toLocaleString("en-BD", { minimumFractionDigits: 2 }) : "$0.00";

const fmtNum = (v: string | null | undefined) =>
  v ? parseFloat(v) : 0;

/* ── Inline bar chart ─────────────────────────────────── */
function MiniBar({
                   value, max, color,
                 }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div
          className={`${color} h-1.5 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-gray-600 w-24 text-right shrink-0">
        {fmt(String(value))}
      </span>
    </div>
  );
}

/* ── Profit badge ─────────────────────────────────────── */
function ProfitBadge({ value }: { value: string | null }) {
  const n = fmtNum(value);
  if (n > 0)
    return <span className="text-emerald-600 font-mono font-semibold text-sm">{fmt(value)}</span>;
  if (n < 0)
    return <span className="text-red-500 font-mono font-semibold text-sm">{fmt(value)}</span>;
  return <span className="text-gray-400 font-mono text-sm">—</span>;
}

/* ── Year range ───────────────────────────────────────── */
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2022 }, (_, i) => currentYear - i);

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"monthly" | "yearly">("monthly");

  const [yearFilter, setYearFilter] = useState(String(currentYear));

  const { data: monthlyData, isLoading: monthlyIsLoading } = useMonthlyReports(
    yearFilter,
    tab === "monthly"
  );
  const monthlyReports = monthlyData?.results ?? [];
  const monthlyTotal = monthlyData?.count ?? 0;
  const monthlyLoading = monthlyIsLoading && !monthlyData;

  const { data: yearlyData, isLoading: yearlyIsLoading } = useYearlyReports(
    tab === "yearly"
  );
  const yearlyReports = yearlyData ?? [];
  const yearlyLoading = yearlyIsLoading && !yearlyData;

  const refreshMonthly = () => queryClient.invalidateQueries({ queryKey: reportKeys.all() });
  const refreshYearly = () => queryClient.invalidateQueries({ queryKey: reportKeys.yearly() });

  /* Modal state */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"monthly" | "yearly">("monthly");
  const [formYear, setFormYear] = useState(String(currentYear));
  const [formMonth, setFormMonth] = useState(String(new Date().getMonth() + 1));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recalcId, setRecalcId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; type: "monthly" | "yearly" } | null>(null);

  /* ── Create ──────────────────────────────────────────── */
  const openCreate = (type: "monthly" | "yearly") => {
    setModalType(type);
    setFormYear(String(currentYear));
    setFormMonth(String(new Date().getMonth() + 1));
    setError(null);
    setModalOpen(true);
  };

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    const payload =
      modalType === "monthly"
        ? { year: parseInt(formYear), month: parseInt(formMonth) }
        : { year: parseInt(formYear) };
    try {
      await apiFetch(
        `${getApiBase()}/reports/${modalType === "monthly" ? "monthly" : "yearly"}/`,
        { method: "POST", body: JSON.stringify(payload) }
      );
      setModalOpen(false);
      modalType === "monthly" ? refreshMonthly() : refreshYearly();
    } catch (err: any) {
      setError(err.message ?? "Failed to generate report");
    } finally { setSaving(false); }
  };

  /* ── Recalculate ─────────────────────────────────────── */
  const recalculate = async (id: number, type: "monthly" | "yearly") => {
    setRecalcId(id);
    try {
      await apiFetch(`${getApiBase()}/reports/${type}/${id}/recalculate/`, { method: "POST" });
      type === "monthly" ? refreshMonthly() : refreshYearly();
    } catch (e) { console.error(e); }
    finally { setRecalcId(null); }
  };

  /* ── Delete ──────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(
        `${getApiBase()}/reports/${deleteTarget.type}/${deleteTarget.id}/`,
        { method: "DELETE" }
      );
      setDeleteTarget(null);
      deleteTarget.type === "monthly" ? refreshMonthly() : refreshYearly();
    } catch (e) { console.error(e); }
  };

  /* ── Monthly chart data ──────────────────────────────── */
  const maxSale = Math.max(...monthlyReports.map((r) => fmtNum(r.sale)), 1);

  /* ── Yearly chart data ───────────────────────────────── */
  const maxYearlySale = Math.max(...yearlyReports.map((r) => fmtNum(r.sale_amount)), 1);

  /* ── Yearly KPIs ─────────────────────────────────────── */
  const totalYearlySale  = yearlyReports.reduce((a, r) => a + fmtNum(r.sale_amount), 0);
  const totalYearlyPurch = yearlyReports.reduce((a, r) => a + fmtNum(r.purchase_amount), 0);

  return (
    <>
      <Breadcrumb pageName="Reports" />

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        {(["monthly", "yearly"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
              tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "monthly" ? "Monthly Reports" : "Yearly Reports"}
          </button>
        ))}
      </div>

      {/* ══════════════ MONTHLY TAB ══════════════ */}
      {tab === "monthly" && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-500 font-medium">Year</label>
              <select
                className="border px-3 py-2 rounded-lg text-sm outline-none focus:border-blue-400"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full">
                {monthlyTotal} reports
              </span>
            </div>
            <button
              onClick={() => openCreate("monthly")}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span> Generate Month
            </button>
          </div>

          {/* Monthly KPI strip — sum of filtered year */}
          {monthlyReports.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Sales",      value: monthlyReports.reduce((a, r) => a + fmtNum(r.sale), 0),            color: "text-blue-700",    accent: "bg-blue-500"   },
                { label: "Total Purchases",  value: monthlyReports.reduce((a, r) => a + fmtNum(r.purchase), 0),        color: "text-gray-800",    accent: "bg-gray-400"   },
                { label: "Total Profit",     value: monthlyReports.reduce((a, r) => a + fmtNum(r.profit), 0),          color: "text-emerald-700", accent: "bg-emerald-500"},
                { label: "Sale Due",         value: monthlyReports.reduce((a, r) => a + fmtNum(r.sale_due_payment), 0),color: "text-orange-600",  accent: "bg-orange-400" },
              ].map(({ label, value, color, accent }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">{label}</p>
                  <p className={`text-xl font-semibold ${color} font-mono`}>
                    {fmt(String(value))}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Monthly table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-400 text-xs uppercase border-b border-gray-100">
                <tr>
                  {["Month", "Sales", "Purchases", "W. Cost", "Damage", "Profit",
                    "Sale Paid", "Sale Due", ""].map((h) => (
                    <th key={h} className={`px-4 py-3 font-semibold tracking-wide ${
                      h === "Month" || h === "" ? "text-left" : "text-right"
                    }`}>{h}</th>
                  ))}
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                {monthlyLoading && (
                  <tr><td colSpan={9} className="text-center py-12 text-gray-400">Loading...</td></tr>
                )}
                {!monthlyLoading && monthlyReports.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-16 text-gray-400">No reports for {yearFilter}</td></tr>
                )}
                {monthlyReports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {r.month_display.slice(0, 3)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{r.month_display}</p>
                          <p className="text-xs text-gray-400">{r.year}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-right font-mono text-xs font-medium text-blue-700 mb-0.5">
                          {fmt(r.sale)}
                        </p>
                        <MiniBar value={fmtNum(r.sale)} max={maxSale} color="bg-blue-400" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-gray-700">{fmt(r.purchase)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">{fmt(r.warehouse_cost)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-red-400">{fmt(r.damage_product)}</td>
                    <td className="px-4 py-3 text-right"><ProfitBadge value={r.profit} /></td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-emerald-600">{fmt(r.sale_paid_payment)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-orange-500">{fmt(r.sale_due_payment)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => recalculate(r.id, "monthly")}
                          disabled={recalcId === r.id}
                          className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md font-medium hover:bg-blue-100 disabled:opacity-50"
                          title="Recalculate"
                        >
                          {recalcId === r.id ? "..." : "↻"}
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: r.id, type: "monthly" })}
                          className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-md font-medium hover:bg-red-100"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly bar chart — sale vs profit */}
          {monthlyReports.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-5">
                Monthly Sales vs Profit — {yearFilter}
              </h3>
              <div className="space-y-3">
                {[...monthlyReports].reverse().map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-8 shrink-0 text-right">
                      {r.month_display.slice(0, 3)}
                    </span>
                    <div className="flex-1 space-y-1">
                      <MiniBar value={fmtNum(r.sale)} max={maxSale} color="bg-blue-400" />
                      <MiniBar value={Math.max(fmtNum(r.profit), 0)} max={maxSale} color="bg-emerald-400" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-xs text-gray-500">Sales</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-gray-500">Profit</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════ YEARLY TAB ══════════════ */}
      {tab === "yearly" && (
        <>
          {/* Toolbar */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full">
              {yearlyReports.length} years
            </span>
            <button
              onClick={() => openCreate("yearly")}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span> Generate Year
            </button>
          </div>

          {/* Yearly KPI strip */}
          {yearlyReports.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">All-time Sales</p>
                <p className="text-2xl font-semibold text-blue-700 font-mono">{fmt(String(totalYearlySale))}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-400" />
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">All-time Purchases</p>
                <p className="text-2xl font-semibold text-gray-800 font-mono">{fmt(String(totalYearlyPurch))}</p>
              </div>
            </div>
          )}

          {/* Yearly cards */}
          {yearlyLoading && (
            <div className="text-center py-16 text-gray-400">Loading...</div>
          )}
          {!yearlyLoading && yearlyReports.length === 0 && (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
              No yearly reports yet
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {yearlyReports.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-gray-200 p-6 relative group hover:shadow-sm transition-shadow"
              >
                {/* Year header */}
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <p className="text-3xl font-bold text-gray-800">{r.year}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Updated {new Date(r.updated).toLocaleDateString("en-BD")}
                    </p>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => recalculate(r.id, "yearly")}
                      disabled={recalcId === r.id}
                      className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg font-medium hover:bg-blue-100 disabled:opacity-50"
                    >
                      {recalcId === r.id ? "..." : "↻ Recalc"}
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: r.id, type: "yearly" })}
                      className="text-xs text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg font-medium hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Bars */}
                <div className="space-y-3">
                  {[
                    { label: "Sales",          value: fmtNum(r.sale_amount),            color: "bg-blue-400"   },
                    { label: "Purchases",       value: fmtNum(r.purchase_amount),        color: "bg-gray-300"   },
                    { label: "Warehouse Costs", value: fmtNum(r.warehouse_cost_amount),  color: "bg-amber-300"  },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-500">{label}</span>
                      </div>
                      <MiniBar value={value} max={maxYearlySale} color={color} />
                    </div>
                  ))}
                </div>

                {/* Payment summary */}
                <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Payment Sent</p>
                    <p className="font-mono text-sm text-gray-700 font-medium">
                      {fmt(r.payment_send_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Payment Received</p>
                    <p className="font-mono text-sm text-emerald-600 font-medium">
                      {fmt(r.payment_receive_amount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Yearly comparison bar chart */}
          {yearlyReports.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-5">Year-over-Year Sales</h3>
              <div className="space-y-3">
                {[...yearlyReports].reverse().map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-12 shrink-0 font-medium">{r.year}</span>
                    <div className="flex-1 space-y-1">
                      <MiniBar value={fmtNum(r.sale_amount)}     max={maxYearlySale} color="bg-blue-400" />
                      <MiniBar value={fmtNum(r.purchase_amount)} max={maxYearlySale} color="bg-gray-300" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-xs text-gray-500">Sales</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded-full bg-gray-300" />
                  <span className="text-xs text-gray-500">Purchases</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Generate Modal ─────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Generate {modalType === "monthly" ? "Monthly" : "Yearly"} Report
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  Aggregates live data from Sales, Purchases and Warehouse
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50"
              >
                ✕
              </button>
            </div>

            <div className="px-7 py-6">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className={`grid gap-4 ${modalType === "monthly" ? "grid-cols-2" : "grid-cols-1"}`}>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Year</label>
                  <select
                    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {modalType === "monthly" && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Month</label>
                    <select
                      className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                      value={formMonth}
                      onChange={(e) => setFormMonth(e.target.value)}
                    >
                      {MONTHS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-4 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                💡 After generating, use the <strong>↻ Recalculate</strong> button any time to refresh figures from current data.
              </p>
            </div>

            <div className="px-7 pb-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 hover:bg-blue-700"
              >
                {saving ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ──────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-7">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete Report?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will soft-delete the report snapshot. Underlying Sales and Purchase data are unaffected.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
