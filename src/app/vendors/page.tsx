"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Pagination } from "@/components/inventory/pagination";
import { TableLoader } from "@/components/inventory/ui-primitives";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { Vendor, VendorFormData } from "@/types/vendor";
import { vendorKeys, useVendors } from "@/hooks/useVendors";

const EMPTY_FORM: VendorFormData = {
  name: "",
  phone_number: "",
  email: "",
  address: "",
};

export default function VendorPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useVendors({ search, page });
  const vendors = data?.results ?? [];
  const total = data?.count ?? 0;
  const loading = isLoading && !data;

  const refreshVendors = () => queryClient.invalidateQueries({ queryKey: vendorKeys.all() });

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<VendorFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailVendor, setDetailVendor] = useState<Vendor | null>(null);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  /* ── Open detail ─────────────────────────────────────── */
  const openDetail = async (id: number) => {
    try {
      const data = await apiFetch(`${getApiBase()}/vendors/${id}/`);
      setDetailVendor(data);
      setDetailOpen(true);
    } catch (e) { console.error(e); }
  };

  /* ── Open create ─────────────────────────────────────── */
  const openCreate = () => {
    setEditTarget(null);
    setFormData(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  };

  /* ── Open edit ───────────────────────────────────────── */
  const openEdit = (v: Vendor) => {
    setEditTarget(v);
    setFormData({
      name:         v.name,
      phone_number: v.phone_number,
      email:        v.email,
      address:      v.address,
    });
    setError(null);
    setDetailOpen(false);
    setModalOpen(true);
  };

  /* ── Save ────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!formData.name.trim()) { setError("Vendor name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      if (editTarget) {
        await apiFetch(`${getApiBase()}/vendors/${editTarget.id}/`, {
          method: "PATCH",
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch(`${getApiBase()}/vendors/`, {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      setModalOpen(false);
      refreshVendors();
    } catch (err: any) {
      setError(err.message ?? "Failed to save vendor");
    } finally { setSaving(false); }
  };

  /* ── Delete ──────────────────────────────────────────── */
  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`${getApiBase()}/vendors/${id}/`, { method: "DELETE" });
      setDeleteId(null);
      setDetailOpen(false);
      refreshVendors();
    } catch (e) { console.error(e); }
  };

  const setField = (k: keyof VendorFormData, v: string) =>
    setFormData((p) => ({ ...p, [k]: v }));

  const pageSize = 25;
  const pages = Math.ceil(total / pageSize);

  return (
    <>
      <Breadcrumb pageName="Vendors" />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <input
          className="border px-3 py-2 rounded-lg text-sm w-64 outline-none focus:border-blue-400"
          placeholder="Search name, phone, email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Add Vendor
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <span className="font-semibold text-gray-800">Vendors</span>
          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full">
            {total} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-400 text-xs uppercase border-b border-gray-100">
            <tr>
              {["Vendor", "Phone", "Email", "Address", "Since", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold tracking-wide">{h}</th>
              ))}
            </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
            {loading && <TableLoader colSpan={6} message="Loading vendors..." />}
            {!loading && vendors.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-16 text-gray-400">
                  No vendors found
                </td>
              </tr>
            )}
            {vendors.map((v) => (
              <tr
                key={v.id}
                className="hover:bg-slate-50 transition-colors cursor-pointer group"
                onClick={() => openDetail(v.id)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {v.name[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-800">{v.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{v.phone_number}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{v.email}</td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{v.address}</td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(v.created).toLocaleDateString("en-BD")}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(v)}
                      className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md font-medium hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(v.id)}
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

      {/* ── Detail Modal ─────────────────────────────────── */}
      {detailOpen && detailVendor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 flex items-center justify-center text-xl font-bold">
                  {detailVendor.name[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{detailVendor.name}</h2>
                  <p className="text-xs text-gray-400">
                    Since {new Date(detailVendor.created).toLocaleDateString("en-BD")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailOpen(false)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50"
              >
                ✕
              </button>
            </div>

            <div className="px-7 py-6 space-y-4">
              {[
                { label: "Phone",   value: detailVendor.phone_number, mono: true  },
                { label: "Email",   value: detailVendor.email,        mono: false },
                { label: "Address", value: detailVendor.address,      mono: false },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
                  <span className={`text-sm text-gray-800 ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
                <span>Updated {new Date(detailVendor.updated).toLocaleDateString("en-BD")}</span>
              </div>
            </div>

            <div className="px-7 pb-6 pt-4 border-t border-gray-100 flex justify-between">
              <button
                onClick={() => setDeleteId(detailVendor.id)}
                className="px-4 py-2 text-sm text-red-500 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 font-medium"
              >
                Delete
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setDetailOpen(false)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => openEdit(detailVendor)}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ──────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editTarget ? "Edit Vendor" : "New Vendor"}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  {editTarget ? `Editing ${editTarget.name}` : "Fill in vendor contact details"}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50"
              >
                ✕
              </button>
            </div>

            <div className="px-7 py-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Vendor Name <span className="text-red-400">*</span>
                </label>
                <input
                  placeholder="e.g. Rupchanda Foods Ltd."
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                  value={formData.name}
                  onChange={(e) => setField("name", e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Phone</label>
                <input
                  placeholder="+880..."
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm font-mono focus:outline-none focus:border-blue-400"
                  value={formData.phone_number}
                  onChange={(e) => setField("phone_number", e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="vendor@example.com"
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                  value={formData.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </div>

              <div>
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
                {saving ? "Saving..." : editTarget ? "Update Vendor" : "Save Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ───────────────────────────────── */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-7">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete Vendor?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will soft-delete the vendor. Existing purchase records will be unaffected.
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
