"use client";

import React, { useState } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { MonthlyPlan, YearlyPlan, MonthlyPlanFormData, YearlyPlanFormData, MONTHS } from "@/types/plan";
import {
  useMonthlyPlans, useYearlyPlans,
  useCreateMonthlyPlan, useUpdateMonthlyPlan, useDeleteMonthlyPlan, useRecalculateMonthlyPlan,
  useCreateYearlyPlan, useUpdateYearlyPlan, useDeleteYearlyPlan, useRecalculateYearlyPlan,
} from "@/hooks/usePlans";

const fmt = (v: string | null | undefined) =>
  v ? "$" + parseFloat(v).toLocaleString("en-BD", { minimumFractionDigits: 2 }) : "$0.00";
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2022 }, (_, i) => currentYear - i);

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.min(pct, 100);
  const overBudget = pct > 100;
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className={`text-xs font-semibold ${overBudget ? "text-red-600" : "text-gray-600"}`}>
          {pct.toFixed(1)}%{overBudget ? " ⚠ Over" : ""}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`${overBudget ? "bg-red-400" : color} h-2 rounded-full transition-all duration-700`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function StatusChip({ pct }: { pct: number }) {
  if (pct === 0) return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Not started</span>;
  if (pct < 50) return <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Behind</span>;
  if (pct < 80) return <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">In progress</span>;
  if (pct < 100) return <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">On track</span>;
  return <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Achieved</span>;
}

function BudgetChip({ pct }: { pct: number }) {
  if (pct === 0) return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">No spend</span>;
  if (pct > 100) return <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold">⚠ Over budget</span>;
  if (pct > 80) return <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">High spend</span>;
  return <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Within budget</span>;
}

function DeleteModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-7">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Delete Plan?</h3>
        <p className="text-sm text-gray-500 mb-6">This soft-deletes the plan. Sales and cost data are unaffected.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  );
}

type PlanFormFieldsProps<T extends MonthlyPlanFormData | YearlyPlanFormData> = {
  form: T;
  setForm: React.Dispatch<React.SetStateAction<T>>;
  showMonthYear: boolean;
};

const sanitizeDecimalInput = (value: string) => {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const integerPart = (parts[0] || "").slice(0, 10);
  const decimalPart = parts.slice(1).join("").slice(0, 2);

  if (cleaned.includes(".")) {
    return `${integerPart}.${decimalPart}`;
  }

  return integerPart;
};

function PlanFormFields<T extends MonthlyPlanFormData | YearlyPlanFormData>({
                                                                              form,
                                                                              setForm,
                                                                              showMonthYear,
                                                                            }: PlanFormFieldsProps<T>) {
  return (
    <div className="space-y-4">
      {showMonthYear && "month" in form && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Year</label>
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-indigo-400"
              value={form.year}
              onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Month</label>
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-indigo-400"
              value={form.month}
              onChange={(e) => setForm((prev) => ({ ...prev, month: e.target.value }))}
            >
              {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {!showMonthYear && (
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Year</label>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-indigo-400"
            value={form.year}
            onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
          >
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Sales Target
        </label>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm text-right font-mono focus:outline-none focus:border-indigo-400"
          value={form.sales_target}
          onChange={(e) => {
            const value = sanitizeDecimalInput(e.target.value);
            setForm((prev) => ({ ...prev, sales_target: value }));
          }}
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Budget
        </label>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm text-right font-mono focus:outline-none focus:border-indigo-400"
          value={form.budget}
          onChange={(e) => {
            const value = sanitizeDecimalInput(e.target.value);
            setForm((prev) => ({ ...prev, budget: value }));
          }}
        />
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-xs text-indigo-700">
        <strong>sales_achieve</strong> and <strong>spent</strong> are auto-calculated from live Sales & WarehouseCost data when saved. Use ↻ Recalculate to refresh.
      </div>
    </div>
  );
}

export default function PlansPage() {
  const [tab, setTab] = useState<"monthly" | "yearly">("monthly");
  const [yearFilter, setYearFilter] = useState(String(currentYear));

  const [monthlyModal, setMonthlyModal] = useState(false);
  const [monthlyEditTarget, setMonthlyEditTarget] = useState<MonthlyPlan | null>(null);
  const [monthlyForm, setMonthlyForm] = useState<MonthlyPlanFormData>({
    year: String(currentYear), month: String(new Date().getMonth() + 1), sales_target: "", budget: "",
  });
  const [monthlyDeleteId, setMonthlyDeleteId] = useState<number | null>(null);
  const [recalcMonthId, setRecalcMonthId] = useState<number | null>(null);

  const [yearlyModal, setYearlyModal] = useState(false);
  const [yearlyEditTarget, setYearlyEditTarget] = useState<YearlyPlan | null>(null);
  const [yearlyForm, setYearlyForm] = useState<YearlyPlanFormData>({
    year: String(currentYear), sales_target: "", budget: "",
  });
  const [yearlyDeleteId, setYearlyDeleteId] = useState<number | null>(null);
  const [recalcYearId, setRecalcYearId] = useState<number | null>(null);

  const { data: monthlyPlans = [], isLoading: monthlyLoading } = useMonthlyPlans(yearFilter);
  const { data: yearlyPlans = [], isLoading: yearlyLoading } = useYearlyPlans();

  const createMonthly = useCreateMonthlyPlan();
  const updateMonthly = useUpdateMonthlyPlan();
  const deleteMonthly = useDeleteMonthlyPlan();
  const recalcMonthly = useRecalculateMonthlyPlan();
  const createYearly = useCreateYearlyPlan();
  const updateYearly = useUpdateYearlyPlan();
  const deleteYearly = useDeleteYearlyPlan();
  const recalcYearly = useRecalculateYearlyPlan();

  const openCreateMonthly = () => {
    setMonthlyEditTarget(null);
    setMonthlyForm({ year: yearFilter, month: String(new Date().getMonth() + 1), sales_target: "", budget: "" });
    setMonthlyModal(true);
  };

  const openEditMonthly = (p: MonthlyPlan) => {
    setMonthlyEditTarget(p);
    setMonthlyForm({ year: String(p.year), month: String(p.month), sales_target: p.sales_target ?? "", budget: p.budget ?? "" });
    setMonthlyModal(true);
  };

  const handleSaveMonthly = async () => {
    if (monthlyEditTarget) {
      await updateMonthly.mutateAsync({ id: monthlyEditTarget.id, form: monthlyForm });
    } else {
      await createMonthly.mutateAsync(monthlyForm);
    }
    setMonthlyModal(false);
  };

  const openCreateYearly = () => {
    setYearlyEditTarget(null);
    setYearlyForm({ year: String(currentYear), sales_target: "", budget: "" });
    setYearlyModal(true);
  };

  const openEditYearly = (p: YearlyPlan) => {
    setYearlyEditTarget(p);
    setYearlyForm({ year: String(p.year), sales_target: p.sales_target ?? "", budget: p.budget ?? "" });
    setYearlyModal(true);
  };

  const handleSaveYearly = async () => {
    if (yearlyEditTarget) {
      await updateYearly.mutateAsync({ id: yearlyEditTarget.id, form: yearlyForm });
    } else {
      await createYearly.mutateAsync(yearlyForm);
    }
    setYearlyModal(false);
  };

  const yearSalesTarget = monthlyPlans.reduce((a, p) => a + parseFloat(p.sales_target || "0"), 0);
  const yearSalesAchieve = monthlyPlans.reduce((a, p) => a + parseFloat(p.sales_achieve || "0"), 0);
  const yearBudget = monthlyPlans.reduce((a, p) => a + parseFloat(p.budget || "0"), 0);
  const yearSpent = monthlyPlans.reduce((a, p) => a + parseFloat(p.spent || "0"), 0);
  const yearAchievePct = yearSalesTarget > 0 ? Math.round((yearSalesAchieve / yearSalesTarget) * 100) : 0;
  const yearBudgetPct = yearBudget > 0 ? Math.round((yearSpent / yearBudget) * 100) : 0;




return (
    <>
      <Breadcrumb pageName="Plans" />

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        {([
          { key: "monthly", label: "Monthly Plans" },
          { key: "yearly",  label: "Yearly Plans"  },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-1.5 rounded-md text-sm font-medium transition-all ${tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "monthly" && (
        <>
          <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-500 font-medium">Year</label>
              <select className="border px-3 py-2 rounded-lg text-sm outline-none focus:border-indigo-400" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={openCreateMonthly} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700">
              <span className="text-lg leading-none">+</span> New Monthly Plan
            </button>
          </div>

          {monthlyPlans.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Year Target",  value: fmt(String(yearSalesTarget)),  color: "text-indigo-700",  accent: "bg-indigo-500" },
                { label: "Year Achieved",value: fmt(String(yearSalesAchieve)), color: "text-emerald-700", accent: "bg-emerald-500" },
                { label: "Year Budget",  value: fmt(String(yearBudget)),       color: "text-gray-800",    accent: "bg-gray-400"   },
                { label: "Year Spent",   value: fmt(String(yearSpent)),        color: "text-orange-600",  accent: "bg-orange-400" },
              ].map(({ label, value, color, accent }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">{label}</p>
                  <p className={`text-lg font-semibold ${color} font-mono`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {monthlyPlans.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">Year Sales Achievement</p>
                <ProgressBar pct={yearAchievePct} color="bg-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">Year Budget Usage</p>
                <ProgressBar pct={yearBudgetPct} color="bg-orange-400" />
              </div>
            </div>
          )}

          {monthlyLoading && <div className="text-center py-16 text-gray-400">Loading...</div>}
          {!monthlyLoading && monthlyPlans.length === 0 && (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">No plans for {yearFilter}</div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {monthlyPlans.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-400 text-xs uppercase border-b border-gray-100">
                  <tr>
                    {["Month", "Sales Target", "Achieved", "Sales Progress", "Budget", "Spent", "Budget Usage", "Status", ""].map((h) => (
                      <th key={h} className={`px-4 py-3 font-semibold tracking-wide ${["Sales Target","Achieved","Budget","Spent"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                  {monthlyPlans.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 group transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {p.month_display.slice(0, 3)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{p.month_display}</p>
                            <p className="text-xs text-gray-400">{p.year}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-700">{fmt(p.sales_target)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-emerald-700">{fmt(p.sales_achieve)}</td>
                      <td className="px-4 py-3 min-w-[140px]"><ProgressBar pct={p.achievement_pct} color="bg-indigo-400" /></td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-700">{fmt(p.budget)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-orange-600">{fmt(p.spent)}</td>
                      <td className="px-4 py-3 min-w-[140px]"><ProgressBar pct={p.budget_used_pct} color="bg-orange-400" /></td>
                      <td className="px-4 py-3"><StatusChip pct={p.achievement_pct} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={async () => { setRecalcMonthId(p.id); await recalcMonthly.mutateAsync(p.id); setRecalcMonthId(null); }}
                            disabled={recalcMonthId === p.id}
                            className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md hover:bg-indigo-100 font-medium disabled:opacity-50"
                            title="Recalculate"
                          >
                            {recalcMonthId === p.id ? "..." : "↻"}
                          </button>
                          <button onClick={() => openEditMonthly(p)} className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 font-medium">Edit</button>
                          <button onClick={() => setMonthlyDeleteId(p.id)} className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-md hover:bg-red-100 font-medium">Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "yearly" && (
        <>
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full">
              {yearlyPlans.length} years
            </span>
            <button onClick={openCreateYearly} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700">
              <span className="text-lg leading-none">+</span> New Yearly Plan
            </button>
          </div>

          {yearlyLoading && <div className="text-center py-16 text-gray-400">Loading...</div>}
          {!yearlyLoading && yearlyPlans.length === 0 && (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">No yearly plans yet</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {yearlyPlans.map((p) => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-6 group hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <p className="text-3xl font-bold text-gray-800">{p.year}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusChip pct={p.achievement_pct} />
                      <BudgetChip pct={p.budget_used_pct} />
                    </div>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={async () => { setRecalcYearId(p.id); await recalcYearly.mutateAsync(p.id); setRecalcYearId(null); }}
                      disabled={recalcYearId === p.id}
                      className="text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 font-medium disabled:opacity-50"
                    >
                      {recalcYearId === p.id ? "..." : "↻ Recalc"}
                    </button>
                    <button onClick={() => openEditYearly(p)} className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 font-medium">Edit</button>
                    <button onClick={() => setYearlyDeleteId(p.id)} className="text-xs text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg hover:bg-red-100 font-medium">Delete</button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Sales Achievement</span>
                    <span>
                      <span className="font-mono text-emerald-700">{fmt(p.sales_achieve)}</span>
                      <span className="text-gray-400"> / {fmt(p.sales_target)}</span>
                    </span>
                  </div>
                  <ProgressBar pct={p.achievement_pct} color="bg-indigo-400" />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Budget Usage</span>
                    <span>
                      <span className="font-mono text-orange-600">{fmt(p.spent)}</span>
                      <span className="text-gray-400"> / {fmt(p.budget)}</span>
                    </span>
                  </div>
                  <ProgressBar pct={p.budget_used_pct} color="bg-orange-400" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {monthlyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{monthlyEditTarget ? "Edit Monthly Plan" : "New Monthly Plan"}</h2>
                <p className="text-sm text-gray-400 mt-0.5">Set sales target and budget</p>
              </div>
              <button onClick={() => setMonthlyModal(false)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50">✕</button>
            </div>
            <div className="px-7 py-6">
              {(createMonthly.isError || updateMonthly.isError) && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {((createMonthly.error || updateMonthly.error) as any)?.message ?? "Failed"}
                </div>
              )}
              <PlanFormFields form={monthlyForm} setForm={setMonthlyForm} showMonthYear={!monthlyEditTarget} />
            </div>
            <div className="px-7 pb-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setMonthlyModal(false)} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveMonthly} disabled={createMonthly.isPending || updateMonthly.isPending} className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 hover:bg-indigo-700">
                {createMonthly.isPending || updateMonthly.isPending ? "Saving..." : monthlyEditTarget ? "Update" : "Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {yearlyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{yearlyEditTarget ? "Edit Yearly Plan" : "New Yearly Plan"}</h2>
                <p className="text-sm text-gray-400 mt-0.5">Set annual sales target and budget</p>
              </div>
              <button onClick={() => setYearlyModal(false)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50">✕</button>
            </div>
            <div className="px-7 py-6">
              {(createYearly.isError || updateYearly.isError) && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {((createYearly.error || updateYearly.error) as any)?.message ?? "Failed"}
                </div>
              )}
              <PlanFormFields form={yearlyForm} setForm={setYearlyForm} showMonthYear={false} />
            </div>
            <div className="px-7 pb-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setYearlyModal(false)} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveYearly} disabled={createYearly.isPending || updateYearly.isPending} className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 hover:bg-indigo-700">
                {createYearly.isPending || updateYearly.isPending ? "Saving..." : yearlyEditTarget ? "Update" : "Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {monthlyDeleteId !== null && (
        <DeleteModal onConfirm={async () => { await deleteMonthly.mutateAsync(monthlyDeleteId); setMonthlyDeleteId(null); }} onClose={() => setMonthlyDeleteId(null)} />
      )}
      {yearlyDeleteId !== null && (
        <DeleteModal onConfirm={async () => { await deleteYearly.mutateAsync(yearlyDeleteId); setYearlyDeleteId(null); }} onClose={() => setYearlyDeleteId(null)} />
      )}
    </>
  );
}
