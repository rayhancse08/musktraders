"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import {
  CashInCategory, CashInItem,
  MonthlyCashInFile, MonthlyCashInFileDetail,
  CashInItemFormData, MonthlyCashInFileFormData,
  MONTHS,
} from "@/types/cashin";
import {
  cashInKeys,
  useCashInCategories,
  useCashInCompanies,
  useCashInMonthlyFiles,
} from "@/hooks/useCashIn";
import { defaultCompanyId } from "@/lib/default-company";

const d4 = (v: string | number) =>
  String(parseFloat(String(v || 0)).toFixed(4));
const fmt = (v: string | null | undefined) =>
  v ? "$" + parseFloat(v).toLocaleString("en-BD", { minimumFractionDigits: 2 }) : "$0.00";
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2022 }, (_, i) => currentYear - i);

// ── Reusable simple-name modal ───────────────────────────────────────────────
function SimpleNameModal({
                           title, label, value, onChange, onSave, onClose, saving, error,
                         }: {
  title: string; label: string; value: string;
  onChange: (v: string) => void; onSave: () => void;
  onClose: () => void; saving: boolean; error: string | null;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50">✕</button>
        </div>
        <div className="px-7 py-6">
          {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{label}</label>
          <input
            autoFocus
            className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-green-400"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSave()}
            placeholder={`Enter ${label.toLowerCase()}...`}
          />
        </div>
        <div className="px-7 pb-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={onSave} disabled={saving} className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 hover:bg-green-700">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm ───────────────────────────────────────────────────────────
function DeleteModal({ label, onConfirm, onClose }: { label: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-7">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Delete {label}?</h3>
        <p className="text-sm text-gray-500 mb-6">This soft-deletes the record. Linked data will be unaffected.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Name tile card ───────────────────────────────────────────────────────────
function NameTile({ name, created, onEdit, onDelete }: { name: string; created: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between group hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-green-50 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {name[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-gray-800 text-sm">{name}</p>
          <p className="text-xs text-gray-400">{new Date(created).toLocaleDateString("en-BD")}</p>
        </div>
      </div>
      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-md hover:bg-green-100 font-medium">Edit</button>
        <button onClick={onDelete} className="text-xs text-red-500 bg-red-50 px-2.5 py-1 rounded-md hover:bg-red-100 font-medium">Del</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function CashInPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"files" | "categories">("files");

  // ── Categories ────────────────────────────────────────────────────────────
  const [catSearch, setCatSearch] = useState("");
  const [catModal, setCatModal] = useState<{ open: boolean; id?: number; value: string; error: string | null; saving: boolean }>
  ({ open: false, value: "", error: null, saving: false });
  const [catDeleteId, setCatDeleteId] = useState<number | null>(null);

  // ── Monthly Cash-In Files ─────────────────────────────────────────────────
  const [filesYear, setFilesYear] = useState(String(currentYear));

  const [fileModal, setFileModal] = useState(false);
  const [fileForm, setFileForm] = useState<MonthlyCashInFileFormData>({
    year: String(currentYear),
    month: String(new Date().getMonth() + 1),
    company_name: "",
  });
  const [fileSaving, setFileSaving] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileDeleteId, setFileDeleteId] = useState<number | null>(null);
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanySaving, setNewCompanySaving] = useState(false);
  const [newCompanyError, setNewCompanyError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailFile, setDetailFile] = useState<MonthlyCashInFileDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [itemModal, setItemModal] = useState(false);
  const [itemEditId, setItemEditId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState<CashInItemFormData>({ cash_in_category: "", date: "", amount: "", notes: "" });
  const [itemSaving, setItemSaving] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemDeleteId, setItemDeleteId] = useState<number | null>(null);

  const { data: categories = [] } = useCashInCategories(
    catSearch,
    tab === "categories" || itemModal
  );
  const { data: companies = [] } = useCashInCompanies(fileModal);
  const { data: filesData, isLoading: filesIsLoading } = useCashInMonthlyFiles(
    filesYear,
    tab === "files"
  );
  const files = filesData?.results ?? [];
  const filesTotal = filesData?.count ?? 0;
  const filesLoading = filesIsLoading && !filesData;
  const appliedDefaultCompany = useRef(false);

  useEffect(() => {
    if (!fileModal) {
      appliedDefaultCompany.current = false;
      return;
    }
    if (appliedDefaultCompany.current) return;
    const companyId = defaultCompanyId(companies);
    if (!companyId) return;
    appliedDefaultCompany.current = true;
    setFileForm((prev) => (prev.company_name ? prev : { ...prev, company_name: companyId }));
  }, [fileModal, companies]);

  const saveCat = async () => {
    if (!catModal.value.trim()) { setCatModal((p) => ({ ...p, error: "Name is required." })); return; }
    setCatModal((p) => ({ ...p, saving: true, error: null }));
    try {
      if (catModal.id) {
        await apiFetch(`${getApiBase()}/cashin/categories/${catModal.id}/`, { method: "PATCH", body: JSON.stringify({ name: catModal.value }) });
      } else {
        await apiFetch(`${getApiBase()}/cashin/categories/`, { method: "POST", body: JSON.stringify({ name: catModal.value }) });
      }
      setCatModal({ open: false, value: "", error: null, saving: false });
      queryClient.invalidateQueries({ queryKey: cashInKeys.categories() });
    } catch (e: any) { setCatModal((p) => ({ ...p, saving: false, error: e.message ?? "Failed" })); }
  };

  const deleteCat = async (id: number) => {
    await apiFetch(`${getApiBase()}/cashin/categories/${id}/`, { method: "DELETE" });
    setCatDeleteId(null);
    queryClient.invalidateQueries({ queryKey: cashInKeys.categories() });
  };

  const loadDetail = async (id: number) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const data = await apiFetch(`${getApiBase()}/cashin/monthly-files/${id}/`);
      setDetailFile(data);
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  };

  const createFile = async () => {
    setFileSaving(true); setFileError(null);
    try {
      await apiFetch(`${getApiBase()}/cashin/monthly-files/`, {
        method: "POST",
        body: JSON.stringify({
          year: parseInt(fileForm.year),
          month: parseInt(fileForm.month),
          company_name: fileForm.company_name || null,
        }),
      });
      setFileModal(false);
      setShowNewCompany(false);
      setNewCompanyName("");
      setNewCompanyError(null);
      queryClient.invalidateQueries({ queryKey: cashInKeys.files(filesYear) });
    } catch (e: any) { setFileError(e.message ?? "Failed"); }
    finally { setFileSaving(false); }
  };

  const createCompanyInline = async () => {
    if (!newCompanyName.trim()) {
      setNewCompanyError("Company name is required.");
      return;
    }
    setNewCompanySaving(true);
    setNewCompanyError(null);
    try {
      const created = await apiFetch(`${getApiBase()}/tax/companies/`, {
        method: "POST",
        body: JSON.stringify({ name: newCompanyName.trim() }),
      });
      await queryClient.invalidateQueries({ queryKey: cashInKeys.companies() });
      setFileForm((p) => ({ ...p, company_name: String(created.id) }));
      setShowNewCompany(false);
      setNewCompanyName("");
    } catch (e: any) {
      setNewCompanyError(e.message ?? "Failed to create company");
    } finally {
      setNewCompanySaving(false);
    }
  };

  const deleteFile = async (id: number) => {
    await apiFetch(`${getApiBase()}/cashin/monthly-files/${id}/`, { method: "DELETE" });
    setFileDeleteId(null);
    queryClient.invalidateQueries({ queryKey: cashInKeys.files(filesYear) });
  };

  // ── Cash-In Items ─────────────────────────────────────────────────────────
  const openAddItem = () => {
    setItemEditId(null);
    setItemForm({ cash_in_category: "", date: new Date().toISOString().slice(0, 10), amount: "", notes: "" });
    setItemError(null);
    setItemModal(true);
  };

  const openEditItem = (item: CashInItem) => {
    setItemEditId(item.id);
    setItemForm({
      cash_in_category: item.cash_in_category ? String(item.cash_in_category) : "",
      date: item.date ?? "",
      amount: item.amount ?? "",
      notes: item.notes ?? "",
    });
    setItemError(null);
    setItemModal(true);
  };

  const saveItem = async () => {
    if (!detailFile) return;
    setItemSaving(true); setItemError(null);
    const payload = {
      month: detailFile.id,
      cash_in_category: itemForm.cash_in_category || null,
      date: itemForm.date || null,
      amount: itemForm.amount ? d4(itemForm.amount) : null,
      notes: itemForm.notes || null,
    };
    try {
      if (itemEditId) {
        await apiFetch(`${getApiBase()}/cashin/items/${itemEditId}/`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await apiFetch(`${getApiBase()}/cashin/items/`, { method: "POST", body: JSON.stringify(payload) });
      }
      setItemModal(false);
      loadDetail(detailFile.id);
    } catch (e: any) { setItemError(e.message ?? "Failed"); }
    finally { setItemSaving(false); }
  };

  const deleteItem = async (id: number) => {
    if (!detailFile) return;
    await apiFetch(`${getApiBase()}/cashin/items/${id}/`, { method: "DELETE" });
    setItemDeleteId(null);
    loadDetail(detailFile.id);
  };

  const totalCashIn = files.reduce((a, f) => a + parseFloat(f.total_amount || "0"), 0);

  return (
    <>
      <Breadcrumb pageName="Cash In" />

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        {([
          { key: "files",      label: "Monthly Files"  },
          { key: "categories", label: "Categories"     },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════ MONTHLY FILES TAB ══════════════ */}
      {tab === "files" && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-500 font-medium">Year</label>
              <select
                className="border px-3 py-2 rounded-lg text-sm outline-none focus:border-green-400"
                value={filesYear}
                onChange={(e) => setFilesYear(e.target.value)}
              >
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full">
                {filesTotal} files
              </span>
            </div>
            <button
              onClick={() => {
                setFileForm({ year: String(currentYear), month: String(new Date().getMonth() + 1), company_name: "" });
                setFileError(null);
                setShowNewCompany(false);
                setNewCompanyName("");
                setNewCompanyError(null);
                setFileModal(true);
              }}
              className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span> New Cash-In File
            </button>
          </div>

          {/* Year total banner */}
          {files.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
                  Total Cash-In — {filesYear}
                </p>
                <p className="text-2xl font-semibold text-green-700 font-mono">{fmt(String(totalCashIn))}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">{filesTotal} monthly files</p>
                <p className="text-xs text-gray-500">
                  {files.reduce((a, f) => a + f.item_count, 0)} cash-in items
                </p>
              </div>
            </div>
          )}

          {/* Files grid */}
          {filesLoading && <div className="text-center py-16 text-gray-400">Loading...</div>}
          {!filesLoading && files.length === 0 && (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
              No cash-in files for {filesYear}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((f) => (
              <div
                key={f.id}
                onClick={() => loadDetail(f.id)}
                className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-sm transition-shadow group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center text-sm font-bold">
                      {f.month_display.slice(0, 3)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{f.month_display} {f.year}</p>
                      <p className="text-xs text-gray-400">{f.company_name_str ?? "No company"}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFileDeleteId(f.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-md bg-red-50 text-red-400 flex items-center justify-center text-xs hover:bg-red-100"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Total</p>
                    <p className="font-mono font-semibold text-green-700">{fmt(f.total_amount)}</p>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                    {f.item_count} items
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ══════════════ CATEGORIES TAB ══════════════ */}
      {tab === "categories" && (
        <>
          <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
            <input
              className="border px-3 py-2 rounded-lg text-sm w-64 outline-none focus:border-green-400"
              placeholder="Search categories..."
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
            />
            <button
              onClick={() => setCatModal({ open: true, value: "", error: null, saving: false })}
              className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span> Add Category
            </button>
          </div>
          {categories.length === 0 && (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
              No categories found
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((c) => (
              <NameTile
                key={c.id}
                name={c.name}
                created={c.created}
                onEdit={() => setCatModal({ open: true, id: c.id, value: c.name, error: null, saving: false })}
                onDelete={() => setCatDeleteId(c.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* ══════════════ DETAIL MODAL ══════════════ */}
      {detailOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center py-8 overflow-y-auto px-4 mt-20">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {detailFile ? `${detailFile.month_display} ${detailFile.year}` : "Loading..."}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  {detailFile?.company_name_str ?? "No company"} · {detailFile?.item_count ?? 0} items
                </p>
              </div>
              <div className="flex items-center gap-2">
                {detailFile && (
                  <button
                    onClick={openAddItem}
                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700"
                  >
                    + Add Item
                  </button>
                )}
                <button
                  onClick={() => { setDetailOpen(false); setDetailFile(null); }}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-7 py-6">
              {detailLoading && <div className="text-center py-16 text-gray-400">Loading...</div>}
              {!detailLoading && detailFile && (
                <>
                  {/* Total banner */}
                  <div className="bg-green-50 border border-green-100 rounded-xl px-5 py-4 mb-5 flex justify-between items-center">
                    <span className="text-sm text-green-700 font-medium">Total Cash-In Amount</span>
                    <span className="font-mono font-bold text-green-800 text-lg">
                      {fmt(detailFile.total_amount)}
                    </span>
                  </div>

                  {/* Items table */}
                  {detailFile.warehouse_costs.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                      No items yet — click "+ Add Item" to start
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-400 uppercase border-b border-gray-100">
                        <tr>
                          {["Category", "Date", "Amount", "Notes", ""].map((h) => (
                            <th key={h} className={`px-4 py-3 font-semibold tracking-wide ${h === "Amount" ? "text-right" : "text-left"}`}>{h}</th>
                          ))}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                        {detailFile.warehouse_costs.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 group">
                            <td className="px-4 py-3">
                                <span className="bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium">
                                  {item.cash_in_category_name}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">{item.date ?? "—"}</td>
                            <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-green-700">
                              {fmt(item.amount)}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                              {item.notes ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => openEditItem(item)}
                                  className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-md hover:bg-green-100 font-medium"
                                >Edit</button>
                                <button
                                  onClick={() => setItemDeleteId(item.id)}
                                  className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-md hover:bg-red-100 font-medium"
                                >Del</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-7 pb-6 pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => { setDetailOpen(false); setDetailFile(null); }}
                className="px-5 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ FILE CREATE MODAL ══════════════ */}
      {fileModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">New Cash-In File</h2>
                <p className="text-sm text-gray-400 mt-0.5">Select year, month and company</p>
              </div>
              <button onClick={() => setFileModal(false)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50">✕</button>
            </div>
            <div className="px-7 py-6 space-y-4">
              {fileError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{fileError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Year</label>
                  <select className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-green-400" value={fileForm.year} onChange={(e) => setFileForm((p) => ({ ...p, year: e.target.value }))}>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Month</label>
                  <select className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-green-400" value={fileForm.month} onChange={(e) => setFileForm((p) => ({ ...p, month: e.target.value }))}>
                    {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</label>
                  {!showNewCompany && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCompany(true);
                        setNewCompanyError(null);
                      }}
                      className="text-xs font-medium text-green-600 hover:text-green-700"
                    >
                      + New Company
                    </button>
                  )}
                </div>
                {!showNewCompany ? (
                  <select
                    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-green-400"
                    value={fileForm.company_name}
                    onChange={(e) => setFileForm((p) => ({ ...p, company_name: e.target.value }))}
                  >
                    <option value="">No company</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <div className="space-y-2 rounded-lg border border-green-100 bg-green-50/50 p-3">
                    {newCompanyError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                        {newCompanyError}
                      </div>
                    )}
                    <input
                      autoFocus
                      className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm bg-white focus:outline-none focus:border-green-400"
                      placeholder="Enter company name..."
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createCompanyInline()}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCompany(false);
                          setNewCompanyName("");
                          setNewCompanyError(null);
                        }}
                        className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={createCompanyInline}
                        disabled={newCompanySaving}
                        className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg font-medium disabled:opacity-60 hover:bg-green-700"
                      >
                        {newCompanySaving ? "Saving..." : "Save Company"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-7 pb-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setFileModal(false)} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={createFile} disabled={fileSaving} className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 hover:bg-green-700">
                {fileSaving ? "Creating..." : "Create File"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ ITEM MODAL ══════════════ */}
      {itemModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start">
              <h2 className="text-lg font-semibold text-gray-900">
                {itemEditId ? "Edit Cash-In Item" : "Add Cash-In Item"}
              </h2>
              <button onClick={() => setItemModal(false)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50">✕</button>
            </div>
            <div className="px-7 py-6 space-y-4">
              {itemError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{itemError}</div>}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Category</label>
                <select className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-green-400" value={itemForm.cash_in_category} onChange={(e) => setItemForm((p) => ({ ...p, cash_in_category: e.target.value }))}>
                  <option value="">Select category...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Date</label>
                <input type="date" className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-green-400" value={itemForm.date} onChange={(e) => setItemForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Amount</label>
                <input type="number" placeholder="0.0000" className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm text-right font-mono focus:outline-none focus:border-green-400" value={itemForm.amount} onChange={(e) => setItemForm((p) => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Notes</label>
                <input placeholder="Optional notes..." className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-green-400" value={itemForm.notes} onChange={(e) => setItemForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="px-7 pb-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setItemModal(false)} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={saveItem} disabled={itemSaving} className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 hover:bg-green-700">
                {itemSaving ? "Saving..." : itemEditId ? "Update" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ SIMPLE NAME MODAL ══════════════ */}
      {catModal.open && (
        <SimpleNameModal
          title={catModal.id ? "Edit Category" : "New Cash-In Category"}
          label="Category Name"
          value={catModal.value}
          onChange={(v) => setCatModal((p) => ({ ...p, value: v }))}
          onSave={saveCat}
          onClose={() => setCatModal({ open: false, value: "", error: null, saving: false })}
          saving={catModal.saving}
          error={catModal.error}
        />
      )}

      {/* ══════════════ DELETE CONFIRMS ══════════════ */}
      {catDeleteId  !== null && <DeleteModal label="category"      onConfirm={() => deleteCat(catDeleteId)}   onClose={() => setCatDeleteId(null)}  />}
      {fileDeleteId !== null && <DeleteModal label="cash-in file"  onConfirm={() => deleteFile(fileDeleteId)} onClose={() => setFileDeleteId(null)} />}
      {itemDeleteId !== null && <DeleteModal label="cash-in item"  onConfirm={() => deleteItem(itemDeleteId)} onClose={() => setItemDeleteId(null)} />}
    </>
  );
}
