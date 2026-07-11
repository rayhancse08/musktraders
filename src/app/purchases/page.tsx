"use client";

import React, { useEffect, useState, useCallback } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { Purchase, PurchaseDetail, PurchaseFormData } from "@/types/purchase";
import PurchaseTable from "@/components/Purchases/PurchaseTable";
import PurchaseCreateModal from "@/components/Purchases/PurchaseCreateModal";
import PurchaseDetailModal from "@/components/Purchases/PurchaseDetailModal";

const EMPTY_FORM: PurchaseFormData = {
  date: new Date().toISOString().slice(0, 10),
  receive_date: "",
  vendor: "",
  lot_number: "",
  shipping_cost: "",
  food_quality_control_cost: "",
  container_clearing_cost: "",
  lory_shipping_cost: "",
  labourer_handling_cost: "",
  warehouse_rent: "",
  employee_salary: "",
  warehouse_other_cost: "",
  profit_margin: "",
  lc_information: "",
  bil_information: "",
  container_information: "",
  purchase_items: [],
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<PurchaseFormData>(EMPTY_FORM);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPurchase, setDetailPurchase] = useState<PurchaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPurchases = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    setLoading(true);
    try {
      const data = await apiFetch(`${getApiBase()}/purchases/?${params}`);
      setPurchases(data.results ?? data);
      setTotal(data.count ?? data.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { loadPurchases(); }, [loadPurchases]);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const data = await apiFetch(`${getApiBase()}/purchases/${id}/`);
      setDetailPurchase(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`${getApiBase()}/purchases/`, {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setCreateOpen(false);
      setFormData(EMPTY_FORM);
      loadPurchases();
    } catch (err: any) {
      setError(err.message ?? "Failed to create purchases");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (purchaseId: number, payload: any) => {
    setSaving(true);
    setError(null);

    try {
      const body = {
        date: payload.date,
        vendor: payload.vendor || null,
        lot_number: payload.lot_number || "",
        shipping_cost: payload.shipping_cost || "0",
        food_quality_control_cost: payload.food_quality_control_cost || "0",
        container_clearing_cost: payload.container_clearing_cost || "0",
        lory_shipping_cost: payload.lory_shipping_cost || "0",
        labourer_handling_cost: payload.labourer_handling_cost || "0",
        warehouse_rent: payload.warehouse_rent || "0",
        employee_salary: payload.employee_salary || "0",
        warehouse_other_cost: payload.warehouse_other_cost || "0",
        lc_information: payload.lc_information || "",
        bil_information: payload.bil_information || "",
        container_information: payload.container_information || "",
        purchase_items: (payload.purchase_items ?? [])
          .filter((item: any) => item.product)
          .map((item: any) => ({
            product: item.product,
            unit_price: item.unit_price || "0",
            purchased_carton: item.purchased_carton || "0",
            received_carton: item.received_carton || "0",
            damaged_carton: item.damaged_carton || "0",
            profit_percentage: item.profit_percentage || "0",
          })),
      };

      await apiFetch(`${getApiBase()}/purchases/${purchaseId}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      await openDetail(purchaseId);
      await loadPurchases();
    } catch (err: any) {
      setError(err.message ?? "Failed to update purchase");
    } finally {
      setSaving(false);
    }
  };



  const handleAddPayment = async (
    purchaseId: number,
    amount: string,
    date: string
  ) => {
    await apiFetch(`${getApiBase()}/purchase-payments/`, {
      method: "POST",
      body: JSON.stringify({ purchase: purchaseId, amount, date }),
    });
    openDetail(purchaseId);
  };

  return (
    <>
      <Breadcrumb pageName="Purchase Orders" />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6 mt-16">
        <div className="flex gap-2 flex-wrap">
          <input
            className="border px-3 py-2 rounded-lg text-sm w-64 outline-none focus:border-blue-400"
            placeholder="Search lot number, vendor..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <button
          onClick={() => { setFormData(EMPTY_FORM); setCreateOpen(true); }}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> New Purchase
        </button>
      </div>

      <PurchaseTable
        purchases={purchases}
        total={total}
        page={page}
        loading={loading}
        onPageChange={setPage}
        onRowClick={openDetail}
      />

      {createOpen && (
        <PurchaseCreateModal
          formData={formData}
          setFormData={setFormData}
          onSave={handleCreate}
          onClose={() => setCreateOpen(false)}
          saving={saving}
          error={error}
        />
      )}

      {detailOpen && (
        <PurchaseDetailModal
          purchase={detailPurchase}
          loading={detailLoading}
          saving={saving}
          onClose={() => {
            setDetailOpen(false);
            setDetailPurchase(null);
          }}
          onAddPayment={handleAddPayment}
          onSaveEdit={handleSaveEdit}
        />

      )}
    </>
  );
}
