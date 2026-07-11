"use client";

import React, { useEffect, useState, useCallback } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Pagination } from "@/components/inventory/pagination";
import {
  SearchInput,
  PrimaryButton,
  SecondaryButton,
  TableLoader,
  Badge,
  DeleteModal,
  AlertError,
  FormLabel,
  FormInput,
} from "@/components/inventory/ui-primitives";
import { Modal } from "@/components/inventory/modal";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { Brand, BrandFormData } from "@/types/brand";

const EMPTY_FORM: BrandFormData = { name: "" };

export default function BrandPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Brand | null>(null);
  const [formData, setFormData] = useState<BrandFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBrands = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    setLoading(true);
    try {
      const data = await apiFetch(`${getApiBase()}/brands/?${params}`);
      setBrands(data.results ?? data);
      setTotal(data.count ?? data.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { loadBrands(); }, [loadBrands]);

  const openCreate = () => {
    setEditTarget(null);
    setFormData(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditTarget(brand);
    setFormData({ name: brand.name });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError("Brand name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editTarget) {
        await apiFetch(`${getApiBase()}/brands/${editTarget.id}/`, {
          method: "PATCH",
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch(`${getApiBase()}/brands/`, {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      setModalOpen(false);
      loadBrands();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save brand");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`${getApiBase()}/brands/${id}/`, { method: "DELETE" });
      setDeleteId(null);
      loadBrands();
    } catch (e) {
      console.error(e);
    }
  };

  const pageSize = 25;
  const pages = Math.ceil(total / pageSize);

  return (
    <>
      <Breadcrumb pageName="Brands" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          placeholder="Search brands..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <div className="flex items-center gap-2">
          <Badge>{total} brands</Badge>
          <PrimaryButton onClick={openCreate}>
            <span className="text-lg leading-none">+</span> Add Brand
          </PrimaryButton>
        </div>
      </div>

      <div className="card mb-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-modern w-full">
            <thead>
              <tr>
                {["Brand", "Created", "Updated", "Actions"].map((h) => (
                  <th key={h} className={h === "Actions" ? "text-right" : "text-left"}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <TableLoader colSpan={4} message="Loading brands..." />}
              {!loading && brands.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400">
                    No brands found
                  </td>
                </tr>
              )}
              {!loading && brands.map((b) => (
                <tr key={b.id} className="group">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-700">
                        {b.name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span className="font-medium text-slate-900">{b.name}</span>
                    </div>
                  </td>
                  <td className="text-slate-500">
                    {new Date(b.created).toLocaleDateString("en-BD")}
                  </td>
                  <td className="text-slate-500">
                    {new Date(b.updated).toLocaleDateString("en-BD")}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(b)}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(b.id)}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
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
      </div>

      {pages > 1 && (
        <Pagination page={page} pages={pages} onChange={setPage} className="card" />
      )}

      {modalOpen && (
        <Modal
          open
          onClose={() => setModalOpen(false)}
          title={editTarget ? "Edit Brand" : "New Brand"}
          subtitle={editTarget ? `Editing ${editTarget.name}` : "Enter the brand name"}
          maxWidth="sm"
          footer={
            <div className="flex justify-end gap-3">
              <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
              <PrimaryButton onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editTarget ? "Update Brand" : "Save Brand"}
              </PrimaryButton>
            </div>
          }
        >
          {error && <AlertError message={error} />}
          <div className="mt-4">
            <FormLabel>Brand Name</FormLabel>
            <FormInput
              placeholder="e.g. Nestle, Unilever..."
              value={formData.name}
              onChange={(e) => setFormData({ name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>
        </Modal>
      )}

      {deleteId !== null && (
        <DeleteModal
          label="brand"
          onConfirm={() => handleDelete(deleteId)}
          onClose={() => setDeleteId(null)}
        />
      )}
    </>
  );
}
