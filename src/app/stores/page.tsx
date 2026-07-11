"use client";

import React, { useEffect, useState, useCallback } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Pagination } from "@/components/inventory/pagination";
import { TableLoader } from "@/components/inventory/ui-primitives";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { Store, StoreFormData } from "@/types/store";

const EMPTY_FORM: StoreFormData = {
  name: "",
  city: "",
  phone_number: "",
  email: "",
  address: "",
  discount_type: "percentage",
  discount: "",
  tax_id: "",
};

export default function StorePage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Store | null>(null);
  const [formData, setFormData] = useState<StoreFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStores = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    setLoading(true);
    try {
      const data = await apiFetch(`${getApiBase()}/stores/?${params}`);
      setStores(data.results ?? data);
      setTotal(data.count ?? data.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { loadStores(); }, [loadStores]);

  const openCreate = () => {
    setEditTarget(null);
    setFormData(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (store: Store) => {
    setEditTarget(store);
    setFormData({
      name:          store.name,
      city:          store.city ?? "",
      phone_number:  store.phone_number,
      email:         store.email,
      address:       store.address,
      discount_type: store.discount_type,
      discount:      store.discount ?? "",
      tax_id:        store.tax_id ?? "",
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editTarget) {
        await apiFetch(`${getApiBase()}/stores/${editTarget.id}/`, {
          method: "PATCH",
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch(`${getApiBase()}/stores/`, {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      setModalOpen(false);
      loadStores();
    } catch (err: any) {
      setError(err.message ?? "Failed to save store");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`${getApiBase()}/stores/${id}/`, { method: "DELETE" });
      setDeleteId(null);
      loadStores();
    } catch (e) {
      console.error(e);
    }
  };

  const setField = (k: keyof StoreFormData, v: string) =>
    setFormData((p) => ({ ...p, [k]: v }));

  const pageSize = 25;
  const pages = Math.ceil(total / pageSize);

  return (
    <>
      <Breadcrumb pageName="Stores" />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6 mt-20">
  <input
    className="border px-3 py-2 rounded-lg text-sm w-64 outline-none focus:border-blue-400"
  placeholder="Search name, city, email..."
  value={search}
  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
  />
  <button
  onClick={openCreate}
  className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
  >
  <span className="text-lg leading-none">+</span> Add Store
    </button>
    </div>

  {/* Table */}
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
  <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
  <span className="font-semibold text-gray-800">Stores</span>
    <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full">
    {total} total
  </span>
  </div>

  <div className="overflow-x-auto">
  <table className="w-full text-sm">
  <thead className="bg-gray-50 text-gray-400 text-xs uppercase border-b border-gray-100">
    <tr>
      {["Name", "City", "Phone", "Email", "Discount", "Tax ID", ""].map((h) => (
    <th key={h} className="px-4 py-3 text-left font-semibold tracking-wide">{h}</th>
))}
  </tr>
  </thead>
  <tbody className="divide-y divide-gray-50">
    {loading && <TableLoader colSpan={7} message="Loading stores..." />}
    {!loading && stores.length === 0 && (
        <tr>
          <td colSpan={7} className="text-center py-16 text-gray-400">No stores found</td>
        </tr>
)}
  {stores.map((s) => (
    <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
  <td className="px-4 py-3 font-medium text-gray-800">
  <div className="flex items-center gap-2">
  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
    {s.name[0]}
    </div>
    {s.name}
    </div>
    </td>
    <td className="px-4 py-3 text-gray-500 text-xs">{s.city ?? "—"}</td>
    <td className="px-4 py-3 text-gray-600 text-xs font-mono">{s.phone_number}</td>
    <td className="px-4 py-3 text-gray-600 text-xs">{s.email}</td>
    <td className="px-4 py-3 text-xs">
    {s.discount ? (
        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
          {s.discount_type === "percentage"
              ? `${s.discount}%`
              : `৳${s.discount}`}
          </span>
      ) : (
        <span className="text-gray-400">—</span>
  )}
    </td>
    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{s.tax_id ?? "—"}</td>
    <td className="px-4 py-3">
  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
  <button
    onClick={() => openEdit(s)}
    className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md font-medium hover:bg-blue-100"
      >
      Edit
      </button>
      <button
    onClick={() => setDeleteId(s.id)}
    className="text-xs text-red-500 bg-red-50 px-2.5 py-1 rounded-md font-medium hover:bg-red-100"
      >
      Delete
      </button>
      </div>
      </td>
      </tr>
  ))}
  </tbody>
  </table>
  </div>

  <Pagination page={page} pages={pages} onChange={setPage} />
  </div>

  {/* Create / Edit Modal */}
  {modalOpen && (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4 mt-20">
    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
    <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">
      {editTarget ? "Edit Store" : "New Store"}
      </h2>
      <p className="text-sm text-gray-400 mt-0.5">
    {editTarget ? `Editing ${editTarget.name}` : "Fill in store details"}
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

    <div className="grid grid-cols-2 gap-4">
    <div className="col-span-2">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Store Name</label>
  <input
    placeholder="e.g. Meena Bazar Gulshan"
    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
    value={formData.name}
    onChange={(e) => setField("name", e.target.value)}
    />
    </div>

    <div>
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">City</label>
      <input
    placeholder="Dhaka"
    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
    value={formData.city}
    onChange={(e) => setField("city", e.target.value)}
    />
    </div>

    <div>
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Phone</label>
      <input
    placeholder="+880..."
    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
    value={formData.phone_number}
    onChange={(e) => setField("phone_number", e.target.value)}
    />
    </div>

    <div>
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Email</label>
      <input
    type="email"
    placeholder="store@example.com"
    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
    value={formData.email}
    onChange={(e) => setField("email", e.target.value)}
    />
    </div>

    <div>
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Tax ID</label>
  <input
    placeholder="Optional"
    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
    value={formData.tax_id}
    onChange={(e) => setField("tax_id", e.target.value)}
    />
    </div>

    <div>
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Discount Type</label>
  <select
    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
    value={formData.discount_type}
    onChange={(e) => setField("discount_type", e.target.value as any)}
  >
    <option value="percentage">Percentage</option>
      <option value="flat">Flat</option>
  </select>
  </div>

  <div>
  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
    Discount {formData.discount_type === "percentage" ? "(%)" : "(৳)"}
    </label>
    <input
    type="number" placeholder="0"
    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
    value={formData.discount}
    onChange={(e) => setField("discount", e.target.value)}
    />
    </div>

    <div className="col-span-2">
  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Address</label>
    <textarea
    rows={3}
    placeholder="Full address..."
    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400 resize-none"
    value={formData.address}
    onChange={(e) => setField("address", e.target.value)}
    />
    </div>
    </div>
    </div>

    <div className="px-7 pb-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
  <button
    onClick={() => setModalOpen(false)}
    className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
      >
      Cancel
      </button>
      <button
    onClick={handleSave}
    disabled={saving}
    className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 hover:bg-blue-700"
      >
      {saving ? "Saving..." : editTarget ? "Update Store" : "Save Store"}
      </button>
      </div>
      </div>
      </div>
  )}

  {/* Delete Confirm */}
  {deleteId !== null && (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-7">
    <h3 className="text-base font-semibold text-gray-900 mb-2">Delete Store?</h3>
    <p className="text-sm text-gray-500 mb-6">
    This will soft-delete the store. Existing sales records will be unaffected.
  </p>
  <div className="flex justify-end gap-3">
  <button
    onClick={() => setDeleteId(null)}
    className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
      >
      Cancel
      </button>
      <button
    onClick={() => handleDelete(deleteId)}
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
