"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { Sale, SaleDetail, SaleFormData } from "@/types/sale";
import SaleTable from "@/components/Sales/SaleTable";
import SaleCreateModal from "@/components/Sales/SaleCreateModal";
import SaleDetailModal from "@/components/Sales/SaleDetailModal";
import { saleKeys, useSales } from "@/hooks/useSales";

const EMPTY_FORM: SaleFormData = {
  date: new Date().toISOString().slice(0, 10),
  delivery_date: "",
  billing_company: "",
  store: "",
  status: "confirmed",
  shipping_charge: "",
  discount_type: "flat",
  discount_amount: "",
  sale_items: [],
};

export default function SalesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSales({ search, status: statusFilter, page });
  const sales = data?.results ?? [];
  const total = data?.count ?? 0;
  const loading = isLoading && !data;

  const refreshSales = () => queryClient.invalidateQueries({ queryKey: saleKeys.all() });

  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<SaleFormData>(EMPTY_FORM);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSale, setDetailSale] = useState<SaleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const data = await apiFetch(`${getApiBase()}/sales/${id}/`);
      setDetailSale(data);
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
      await apiFetch(`${getApiBase()}/sales/`, {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setCreateOpen(false);
      setFormData(EMPTY_FORM);
      refreshSales();
    } catch (err: any) {
      setError(err.message ?? "Failed to create sale");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (saleId: number, payload: any) => {
    setSaving(true);
    setError(null);

    try {
      const body = {
        date: payload.date,
        delivery_date: payload.delivery_date || null,
        billing_company: payload.billing_company || null,
        store: payload.store,
        status: payload.status,
        shipping_charge: payload.shipping_charge || "0.0000",
        discount_type: payload.discount_type,
        discount_amount: payload.discount_amount || "0.0000",
        sale_items: (payload.sale_items ?? []).map((item: any) => ({
          product: item.product,
          quantity: item.quantity || "0",
          packet_price: item.packet_price || "0.0000",
          price: item.price || item.price || "0.0000",
          discount: item.discount || "0.0000",
        })),
      };

      await apiFetch(`${getApiBase()}/sales/${saleId}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      await openDetail(saleId);
      await refreshSales();
    } catch (err: any) {
      setError(err.message ?? "Failed to update sale");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };



  const handleStatusChange = async (id: number, status: string) => {
    try {
      const updated = await apiFetch(`${getApiBase()}/sales/${id}/status/`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setDetailSale(updated);
      refreshSales();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPayment = async (saleId: number, amount: string, date: string) => {
    await apiFetch(`${getApiBase()}/payments/`, {
      method: "POST",
      body: JSON.stringify({ sale: saleId, amount, date }),
    });
    openDetail(saleId);
  };

  return (
    <>
      <Breadcrumb pageName="Sales Orders" />

      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap">
          <input
            className="border px-3 py-2 rounded-lg text-sm w-64 outline-none focus:border-blue-400"
            placeholder="Search order, store..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="border px-3 py-2 rounded-lg text-sm outline-none"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="packing">Packing</option>
            <option value="delivering">Delivering</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <button
          onClick={() => {
            setFormData(EMPTY_FORM);
            setCreateOpen(true);
          }}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> New Sale
        </button>
      </div>

      <SaleTable
        sales={sales}
        total={total}
        page={page}
        loading={loading}
        onPageChange={setPage}
        onRowClick={openDetail}
      />

      {createOpen && (
        <SaleCreateModal
          formData={formData}
          setFormData={setFormData}
          onSave={handleCreate}
          onClose={() => setCreateOpen(false)}
          saving={saving}
          error={error}
        />
      )}

      {detailOpen && (
        <SaleDetailModal
          sale={detailSale}
          loading={detailLoading}
          saving={saving}
          onClose={() => { setDetailOpen(false); setDetailSale(null); }}
          onStatusChange={handleStatusChange}
          onAddPayment={handleAddPayment}
          onSaveEdit={handleSaveEdit}
        />

      )}
    </>
  );
}
