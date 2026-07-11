"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Modal } from "@/components/inventory/modal";
import { Pagination } from "@/components/inventory/pagination";
import { KpiCard } from "@/components/inventory/kpi-card";
import {
  InventoryCard, Badge, SearchInput, FormLabel, FormInput,
  PrimaryButton, SecondaryButton, AlertError, EmptyState, DangerButton,
  TableLoader,
} from "@/components/inventory/ui-primitives";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import {
  WarehouseItem,
  WarehouseItemDetail,
  WarehouseItemFormData,
} from "@/types/warehouse";
import { warehouseKeys, useWarehouseItems } from "@/hooks/useWarehouse";

const EMPTY_FORM: WarehouseItemFormData = {
  product: "",
  lot_number: "",
  product_price: "",
  carton_handling_cost: "",
  purchased_price: "",
  profit_percentage: "",
  stocked_quantity: "",
  damaged_quantity: "",
  manual_remaining_quantity: "",
};

const d4 = (v: string | number) =>
  String(parseFloat(String(v || 0)).toFixed(4));

const fmt = (v: string | null | undefined) =>
  v ? "$" + parseFloat(v).toLocaleString("en-BD", { minimumFractionDigits: 2 }) : "—";

/* Stock level badge */
function StockBadge({ remaining, stocked }: { remaining: number | null; stocked: number | null }) {
  if (remaining === null || stocked === null || stocked === 0) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  const pct = (remaining / stocked) * 100;
  if (remaining === 0)
    return <span className="bg-red-50 text-red-600 border border-red-200 text-xs px-2 py-0.5 rounded-full font-medium">Out of stock</span>;
  if (pct <= 20)
    return <span className="bg-orange-50 text-orange-600 border border-orange-200 text-xs px-2 py-0.5 rounded-full font-medium">Low — {remaining}</span>;
  if (pct <= 50)
    return <span className="bg-amber-50 text-amber-600 border border-amber-200 text-xs px-2 py-0.5 rounded-full font-medium">Medium — {remaining}</span>;
  return <span className="bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-0.5 rounded-full font-medium">Good — {remaining}</span>;
}

/* Mini stock bar */
function StockBar({ remaining, stocked }: { remaining: number | null; stocked: number | null }) {
  if (!remaining || !stocked) return null;
  const pct = Math.min((remaining / stocked) * 100, 100);
  const color = pct <= 20 ? "bg-red-400" : pct <= 50 ? "bg-amber-400" : "bg-green-400";
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

type ProductOption = { id: number; name: string; packet_per_carton: number };

export default function WarehousePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [lotFilter, setLotFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useWarehouseItems({ search, lotFilter, page });
  const items = data?.results ?? [];
  const total = data?.count ?? 0;
  const loading = isLoading && !data;

  const refreshItems = () => queryClient.invalidateQueries({ queryKey: warehouseKeys.all() });

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WarehouseItemDetail | null>(null);
  const [formData, setFormData] = useState<WarehouseItemFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<WarehouseItemDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const data = await apiFetch(`${getApiBase()}/warehouse/${id}/`);
      setDetailItem(data);
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  };

  const openCreate = () => {
    setEditTarget(null);
    setFormData(EMPTY_FORM);
    setProductSearch("");
    setProductOptions([]);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = async (id: number) => {
    try {
      const data: WarehouseItemDetail = await apiFetch(`${getApiBase()}/warehouse/${id}/`);
      setEditTarget(data);
      setFormData({
        product:                   String(data.product),
        lot_number:                data.lot_number ?? "",
        product_price:             data.product_price ?? "",
        carton_handling_cost:      data.carton_handling_cost ?? "",
        purchased_price:           data.purchased_price ?? "",
        profit_percentage:         data.profit_percentage ?? "",
        stocked_quantity:          String(data.stocked_quantity ?? ""),
        damaged_quantity:          String(data.damaged_quantity ?? ""),
        manual_remaining_quantity: String(data.manual_remaining_quantity ?? ""),
      });
      setProductSearch(data.product_name);
      setError(null);
      setModalOpen(true);
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    if (!editTarget && !formData.product) {
      setError("Please select a product from the search results.");
      return;
    }
    if (!formData.stocked_quantity) {
      setError("Stocked cartons quantity is required.");
      return;
    }

    setSaving(true);
    setError(null);
    const payload = {
      ...formData,
      product_price:        formData.product_price        ? d4(formData.product_price)        : null,
      carton_handling_cost: formData.carton_handling_cost ? d4(formData.carton_handling_cost) : null,
      purchased_price:      formData.purchased_price      ? d4(formData.purchased_price)      : null,
      profit_percentage:    formData.profit_percentage    ? d4(formData.profit_percentage)    : null,
    };
    try {
      if (editTarget) {
        await apiFetch(`${getApiBase()}/warehouse/${editTarget.id}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`${getApiBase()}/warehouse/`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setModalOpen(false);
      refreshItems();
    } catch (err: any) {
      setError(err.message ?? "Failed to save");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`${getApiBase()}/warehouse/${id}/`, { method: "DELETE" });
      setDeleteId(null);
      refreshItems();
    } catch (e) { console.error(e); }
  };

  const setField = (k: keyof WarehouseItemFormData, v: string) =>
    setFormData((p) => ({ ...p, [k]: v }));

  /* Product autocomplete with debounce */
  const searchProductTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const onProductSearch = (q: string) => {
    setProductSearch(q);
    if (searchProductTimer.current) clearTimeout(searchProductTimer.current);
    searchProductTimer.current = setTimeout(async () => {
      if (!q) return setProductOptions([]);
      const res = await apiFetch(
        `${getApiBase()}/products/autocomplete/?q=${encodeURIComponent(q)}`
      );
      setProductOptions(res);
    }, 300);
  };

  const pageSize = 25;
  const pages = Math.ceil(total / pageSize);

  /* Summary stats from current page */
  const totalStocked   = items.reduce((a, i) => a + (i.stocked_quantity ?? 0), 0);
  const totalRemaining = items.reduce((a, i) => a + (i.remaining_quantity ?? 0), 0);
  const totalSold      = items.reduce((a, i) => a + (i.sale_quantity ?? 0), 0);
  const outOfStock     = items.filter((i) => (i.remaining_quantity ?? 0) === 0).length;

  return (
    <>
      <Breadcrumb pageName="Warehouse" />

      {/* KPI strip — values from current page */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Stocked (this page)" value={totalStocked} accent="blue" />
        <KpiCard label="Remaining (this page)" value={totalRemaining} accent="green" />
        <KpiCard label="Sold (this page)" value={totalSold} accent="indigo" />
        <KpiCard label="Out of Stock (page)" value={outOfStock} accent="red" sub="lots with 0 remaining" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap">
          <SearchInput
            placeholder="Search product..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <SearchInput
            className="w-40"
            placeholder="Filter lot no..."
            value={lotFilter}
            onChange={(e) => { setLotFilter(e.target.value); setPage(1); }}
          />
        </div>
        <PrimaryButton onClick={openCreate}>
          <span className="text-lg leading-none">+</span> Add Item
        </PrimaryButton>
      </div>

      {/* Table */}
      <InventoryCard
        title="Warehouse Inventory"
        badge={<Badge>{total} items</Badge>}
      >

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-400 text-xs uppercase border-b border-gray-100">
            <tr>
              {[
                "Product", "Lot", "Purch. Price", "Sale Price",
                "Stocked", "Sold (Ctn)", "Sold (Pcs)", "Damaged",
                "Remaining", "Stock Level", ""
              ].map((h) => (
                <th key={h} className={`px-4 py-3 font-semibold tracking-wide ${
                  ["Purch. Price","Sale Price","Stocked","Sold (Ctn)","Sold (Pcs)","Damaged"].includes(h)
                    ? "text-right" : "text-left"
                }`}>{h}</th>
              ))}
            </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
            {loading && <TableLoader colSpan={11} message="Loading warehouse items..." />}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={11}>
                  <EmptyState message="No warehouse items found. Add stock lots to get started." />
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-slate-50 transition-colors cursor-pointer group"
                onClick={() => openDetail(item.id)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {item.product_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-xs leading-tight">{item.product_name}</p>
                      <p className="text-xs text-gray-400">{item.packet_per_carton} pkt/ctn</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {item.lot_number ?? "—"}
                    </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-gray-600">
                  {fmt(item.purchased_price)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-blue-600 font-medium">
                  {fmt(item.sale_price)}
                </td>
                <td className="px-4 py-3 text-right text-xs text-gray-600">
                  {item.stocked_quantity ?? "—"}
                </td>
                <td className="px-4 py-3 text-right text-xs text-gray-600">
                  {item.sale_quantity ?? 0}
                </td>
                <td className="px-4 py-3 text-right text-xs text-gray-500">
                  {item.sale_packet_quantity ?? 0}
                </td>
                <td className="px-4 py-3 text-right text-xs text-red-500">
                  {item.damaged_quantity ?? 0}
                </td>
                <td className="px-4 py-3 text-left text-xs">
                  <p className="text-gray-700 font-medium">
                    {item.remaining_quantity ?? "—"} ctn
                  </p>
                  <p className="text-gray-400">
                    {item.remaining_packet_quantity ?? "—"} pcs
                  </p>
                  <StockBar remaining={item.remaining_quantity} stocked={item.stocked_quantity} />
                </td>
                <td className="px-4 py-3">
                  <StockBadge remaining={item.remaining_quantity} stocked={item.stocked_quantity} />
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(item.id)}
                      className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md font-medium hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="text-xs text-red-500 bg-red-50 px-2.5 py-1 rounded-md font-medium hover:bg-red-100"
                    >
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pages={pages} onChange={setPage} />
      </InventoryCard>

      {/* ── Detail Modal ────────────────────────────────── */}
      {detailOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center py-8 overflow-y-auto px-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl">
            <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {detailItem?.product_name ?? "Loading..."}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  {detailItem?.lot_number && (
                    <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {detailItem.lot_number}
                    </span>
                  )}
                  {detailItem && (
                    <StockBadge
                      remaining={detailItem.remaining_quantity}
                      stocked={detailItem.stocked_quantity}
                    />
                  )}
                </div>
              </div>
              <button
                onClick={() => { setDetailOpen(false); setDetailItem(null); }}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50"
              >
                ✕
              </button>
            </div>

            <div className="px-7 py-6">
              {detailLoading && (
                <div className="text-center py-16 text-gray-400">Loading...</div>
              )}
              {!detailLoading && detailItem && (
                <>
                  {/* Stock overview grid */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { label: "Stocked",         value: detailItem.stocked_quantity ?? "—",           sub: "cartons",   color: "text-gray-800" },
                      { label: "Sold",             value: detailItem.sale_quantity ?? 0,                sub: "cartons",   color: "text-blue-600" },
                      { label: "Sold (Pcs)",       value: detailItem.sale_packet_quantity ?? 0,         sub: "packets",   color: "text-blue-500" },
                      { label: "Damaged",          value: detailItem.damaged_quantity ?? 0,             sub: "cartons",   color: "text-red-500" },
                      { label: "Returned",         value: detailItem.return_quantity ?? 0,              sub: "cartons",   color: "text-amber-600" },
                      { label: "Remaining",        value: `${detailItem.remaining_quantity ?? "—"} ctn / ${detailItem.remaining_packet_quantity ?? "—"} pcs`, sub: "", color: "text-green-700" },
                    ].map(({ label, value, sub, color }) => (
                      <div key={label} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">{label}</p>
                        <p className={`text-lg font-semibold ${color}`}>{value}</p>
                        {sub && <p className="text-xs text-gray-400">{sub}</p>}
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-5">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pricing</p>
                      {[
                        { label: "Product Price",       value: fmt(detailItem.product_price) },
                        { label: "Carton Handling Cost",value: fmt(detailItem.carton_handling_cost) },
                        { label: "Purchased Price",     value: fmt(detailItem.purchased_price) },
                        { label: "Profit % (÷)",        value: detailItem.profit_percentage ?? "default" },
                        { label: "Sale Price",          value: fmt(detailItem.sale_price), bold: true, color: "text-blue-600" },
                      ].map(({ label, value, bold, color }) => (
                        <div key={label} className="flex justify-between py-2 border-b border-gray-200 last:border-0">
                          <span className="text-sm text-gray-500">{label}</span>
                          <span className={`font-mono text-sm ${bold ? "font-semibold" : "font-medium"} ${color ?? "text-gray-800"}`}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gray-50 rounded-xl p-5">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Financials</p>
                      {[
                        { label: "Total Purchase Cost", value: fmt(detailItem.total_purchased_price) },
                        { label: "Total Sale Value",    value: fmt(detailItem.total_sale_price),     color: "text-blue-600" },
                        { label: "Expected Sales",      value: fmt(detailItem.expected_total_sale_price), color: "text-emerald-600" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex justify-between py-2 border-b border-gray-200 last:border-0">
                          <span className="text-sm text-gray-500">{label}</span>
                          <span className={`font-mono text-sm font-medium ${color ?? "text-gray-800"}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-7 pb-6 pt-4 border-t border-gray-100 flex justify-between">
              <button
                onClick={() => { setDetailOpen(false); detailItem && openEdit(detailItem.id); }}
                className="px-5 py-2 text-sm text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 font-medium"
              >
                Edit Item
              </button>
              <button
                onClick={() => { setDetailOpen(false); setDetailItem(null); }}
                className="px-5 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ─────────────────────────── */}
      {modalOpen && (
        <Modal
          open
          onClose={() => setModalOpen(false)}
          title={editTarget ? "Edit Warehouse Item" : "New Warehouse Item"}
          subtitle={editTarget ? editTarget.product_name : "Link a product to a lot"}
          maxWidth="2xl"
          footer={
            <div className="flex justify-end gap-3">
              <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
              <PrimaryButton onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editTarget ? "Update Item" : "Save Item"}
              </PrimaryButton>
            </div>
          }
        >
          {error && <AlertError message={error} />}

              <div className="grid grid-cols-2 gap-4">
                {/* Product autocomplete */}
                <div className="col-span-2 relative">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Product</label>
                  <input
                    placeholder="Search product..."
                    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                    value={productSearch}
                    onChange={(e) => onProductSearch(e.target.value)}
                    disabled={!!editTarget}
                  />
                  {productOptions.length > 0 && (
                    <div className="absolute z-10 bg-white border border-gray-200 rounded-xl shadow-lg w-full mt-1 overflow-hidden">
                      {productOptions.map((p) => (
                        <div
                          key={p.id}
                          className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm flex justify-between"
                          onClick={() => {
                            setField("product", String(p.id));
                            setProductSearch(p.name);
                            setProductOptions([]);
                          }}
                        >
                          <span className="font-medium text-gray-800">{p.name}</span>
                          <span className="text-xs text-gray-400">{p.packet_per_carton} pkt/ctn</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Lot Number</label>
                  <input
                    placeholder="e.g. LOT-2026-001"
                    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                    value={formData.lot_number}
                    onChange={(e) => setField("lot_number", e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Stocked Cartons</label>
                  <input
                    type="number" placeholder="0"
                    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                    value={formData.stocked_quantity}
                    onChange={(e) => setField("stocked_quantity", e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Product Price</label>
                  <input
                    type="number" placeholder="0.0000"
                    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm text-right font-mono focus:outline-none focus:border-blue-400"
                    value={formData.product_price}
                    onChange={(e) => setField("product_price", e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Carton Handling Cost</label>
                  <input
                    type="number" placeholder="0.0000"
                    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm text-right font-mono focus:outline-none focus:border-blue-400"
                    value={formData.carton_handling_cost}
                    onChange={(e) => setField("carton_handling_cost", e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Purchased Price</label>
                  <input
                    type="number" placeholder="0.0000"
                    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm text-right font-mono focus:outline-none focus:border-blue-400"
                    value={formData.purchased_price}
                    onChange={(e) => setField("purchased_price", e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Profit % (divisor)
                  </label>
                  <input
                    type="number" placeholder="Uses system default if blank"
                    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm text-right font-mono focus:outline-none focus:border-blue-400"
                    value={formData.profit_percentage}
                    onChange={(e) => setField("profit_percentage", e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Damaged Cartons</label>
                  <input
                    type="number" placeholder="0"
                    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                    value={formData.damaged_quantity}
                    onChange={(e) => setField("damaged_quantity", e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Manual Remaining Override
                    <span className="ml-1 text-gray-400 normal-case font-normal">(optional)</span>
                  </label>
                  <input
                    type="number" placeholder="Leave blank to auto-calculate"
                    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                    value={formData.manual_remaining_quantity}
                    onChange={(e) => setField("manual_remaining_quantity", e.target.value)}
                  />
                </div>
              </div>
        </Modal>
      )}

      {deleteId !== null && (
        <Modal
          open
          onClose={() => setDeleteId(null)}
          title="Delete Warehouse Item?"
          maxWidth="sm"
          footer={
            <div className="flex justify-end gap-3">
              <SecondaryButton onClick={() => setDeleteId(null)}>Cancel</SecondaryButton>
              <DangerButton onClick={() => handleDelete(deleteId)}>Delete</DangerButton>
            </div>
          }
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This will soft-delete the item. Sale records linked to this lot will be unaffected.
          </p>
        </Modal>
      )}
    </>
  );
}
