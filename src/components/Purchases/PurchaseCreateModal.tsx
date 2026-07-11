"use client";

import React, { useEffect, useState, useRef } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import {
  PurchaseFormData, PurchaseItemFormData,
  VendorOption, ProductOption,
} from "@/types/purchase";

type Props = {
  formData: PurchaseFormData;
  setFormData: React.Dispatch<React.SetStateAction<PurchaseFormData>>;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error: string | null;
};

const EMPTY_ITEM: PurchaseItemFormData = {
  product: "", product_name: "",
  unit_price: "", purchased_carton: "",
  received_carton: "0", damaged_carton: "0",
  profit_percentage: "0",
};

// Clamp to 4 decimal places (API constraint)
const d4 = (v: string | number) =>
  String(parseFloat(String(v || 0)).toFixed(4));

// Cost fields config — label + form key
const COST_FIELDS: { label: string; key: keyof PurchaseFormData }[] = [
  { label: "Shipping Cost",              key: "shipping_cost" },
  { label: "Food Quality Control",       key: "food_quality_control_cost" },
  { label: "Container Clearing",         key: "container_clearing_cost" },
  { label: "Lorry Shipping",             key: "lory_shipping_cost" },
  { label: "Labourer Handling",          key: "labourer_handling_cost" },
  { label: "Warehouse Rent",             key: "warehouse_rent" },
  { label: "Employee Salary",            key: "employee_salary" },
  { label: "Other Warehouse Cost",       key: "warehouse_other_cost" },
];

const DECIMAL_COST_KEYS = COST_FIELDS.map((f) => f.key);
const DECIMAL_ITEM_KEYS: (keyof PurchaseItemFormData)[] = [
  "unit_price", "profit_percentage",
];

export default function PurchaseCreateModal({
                                              formData, setFormData, onSave, onClose, saving, error,
                                            }: Props) {
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [searches, setSearches] = useState<string[]>([]);
  const [options, setOptions] = useState<ProductOption[][]>([]);
  const [costOpen, setCostOpen] = useState(false);
  const timerRefs = useRef<(ReturnType<typeof setTimeout> | null)[]>([]);

  const [vendorPage, setVendorPage] = useState(1);

  useEffect(() => {
    const loadVendors = async () => {
      try {
        const res = await apiFetch(
          `${getApiBase()}/vendors/autocomplete/?page=${vendorPage}`
        );

        setVendors(res.results ?? res);

      } catch (e) {
        console.error(e);
      }
    };

    loadVendors();
  }, [vendorPage]);

  const setField = (k: keyof PurchaseFormData, v: string) =>
    setFormData((p) => ({ ...p, [k]: v }));

  const addItem = () => {
    setFormData((p) => ({
      ...p, purchase_items: [...p.purchase_items, { ...EMPTY_ITEM }],
    }));
    setSearches((p) => [...p, ""]);
    setOptions((p) => [...p, []]);
  };

  const removeItem = (i: number) => {
    setFormData((p) => ({
      ...p, purchase_items: p.purchase_items.filter((_, j) => j !== i),
    }));
    setSearches((p) => p.filter((_, j) => j !== i));
    setOptions((p) => p.filter((_, j) => j !== i));
  };

  const updateItem = (i: number, k: keyof PurchaseItemFormData, v: string) => {
    setFormData((p) => {
      const items = [...p.purchase_items];
      items[i] = { ...items[i], [k]: v };
      return { ...p, purchase_items: items };
    });
  };

  const searchProducts = (i: number, q: string) => {
    const arr = [...searches]; arr[i] = q; setSearches(arr);
    if (timerRefs.current[i]) clearTimeout(timerRefs.current[i]!);
    timerRefs.current[i] = setTimeout(async () => {
      if (!q) return;
      const res: ProductOption[] = await apiFetch(
        `${getApiBase()}/products/autocomplete/?q=${encodeURIComponent(q)}`
      );
      setOptions((p) => { const a = [...p]; a[i] = res; return a; });
    }, 300);
  };

  const selectProduct = (i: number, p: ProductOption) => {
    updateItem(i, "product", String(p.id));
    updateItem(i, "product_name", p.name);
    const s = [...searches]; s[i] = p.name; setSearches(s);
    setOptions((prev) => { const a = [...prev]; a[i] = []; return a; });
  };

  // Live subtotal from items
  const productTotal = formData.purchase_items.reduce((acc, item) => {
    const unitPrice = parseFloat(item.unit_price) || 0;
    const cartons  = parseFloat(item.purchased_carton) || 0;
    // total_price = unit_price * packet_per_carton * cartons — we approximate inline
    return acc + unitPrice * cartons;
  }, 0);

  const costTotal = DECIMAL_COST_KEYS.reduce(
    (acc, k) => acc + (parseFloat(formData[k] as string) || 0), 0
  );
  const grandTotal = productTotal + costTotal;

  const fmt = (v: number) =>
    "$" + v.toLocaleString("en-BD", { minimumFractionDigits: 2 });

  // Sanitize all decimal fields before submitting
  const handleSave = () => {
    setFormData((p) => ({
      ...p,
      ...Object.fromEntries(
        DECIMAL_COST_KEYS.map((k) => [k, p[k] ? d4(p[k] as string) : p[k]])
      ),
      purchase_items: p.purchase_items.map((item) => ({
        ...item,
        ...Object.fromEntries(
          DECIMAL_ITEM_KEYS.map((k) => [k, item[k] ? d4(item[k]) : item[k]])
        ),
      })),
    }));
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center py-8 overflow-y-auto px-4 mt-20">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl">

        {/* Header */}
        <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">New Purchase Order</h2>
            <p className="text-sm text-gray-400 mt-0.5">Enter lot details, costs and products</p>
          </div>
          <button
            onClick={onClose}
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

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Lot Number
              </label>
              <input
                placeholder="e.g. LOT-2026-001"
                className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                value={formData.lot_number}
                onChange={(e) => setField("lot_number", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Vendor
              </label>
              <select
                className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                value={formData.vendor}
                onChange={(e) => setField("vendor", e.target.value)}
              >
                <option value="">Select vendor...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Purchase Date
              </label>
              <input
                type="date"
                className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                value={formData.date}
                onChange={(e) => setField("date", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Receive Date
              </label>
              <input
                type="date"
                className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                value={formData.receive_date}
                onChange={(e) => setField("receive_date", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Profit Margin %
              </label>
              <input
                type="number" placeholder="e.g. 120 (divisor)"
                className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                value={formData.profit_margin}
                onChange={(e) => setField("profit_margin", e.target.value)}
              />
            </div>
          </div>

          {/* Cost breakdown — collapsible */}
          <div className="mb-6">
            <button
              onClick={() => setCostOpen((o) => !o)}
              className="flex items-center gap-3 w-full mb-2"
            >
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Cost Breakdown
              </span>
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
                {costOpen ? "▲ hide" : "▼ show"}
              </span>
            </button>

            {costOpen && (
              <div className="grid grid-cols-2 gap-3 border border-gray-100 rounded-xl p-4 bg-gray-50">
                {COST_FIELDS.map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-xs text-gray-400 block mb-1">{label}</label>
                    <input
                      type="number" placeholder="0.00"
                      className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm text-right font-mono bg-white focus:outline-none focus:border-blue-400"
                      value={formData[key] as string}
                      onChange={(e) => setField(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Purchase Items
            </span>
            <div className="flex-1 h-px bg-gray-100" />
            <button
              onClick={addItem}
              className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg font-medium"
            >
              + Add Item
            </button>
          </div>

          {formData.purchase_items.length === 0 && (
            <div className="border border-dashed border-gray-200 rounded-lg py-8 text-center text-sm text-gray-400 mb-4">
              No items yet — click "+ Add Item" to start
            </div>
          )}

          <div className="space-y-2 mb-5">
            {formData.purchase_items.map((item, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50">

                {/* Product autocomplete */}
                <div className="relative mb-3">
                  <input
                    placeholder="Search product..."
                    className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm bg-white focus:outline-none focus:border-blue-400"
                    value={searches[i] ?? ""}
                    onChange={(e) => searchProducts(i, e.target.value)}
                  />
                  {(options[i] ?? []).length > 0 && (
                    <div className="absolute z-10 bg-white border border-gray-200 rounded-xl shadow-lg w-full mt-1 overflow-hidden">
                      {options[i].map((p) => (
                        <div
                          key={p.id}
                          className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm flex justify-between items-center"
                          onClick={() => selectProduct(i, p)}
                        >
                          <span className="font-medium text-gray-800">{p.name}</span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                            {p.packet_per_carton} pkt/ctn · Stock: {p.stocked_quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Numeric fields */}
                <div className="grid grid-cols-6 gap-2 items-end">
                  {[
                    { label: "Unit Price",       key: "unit_price" },
                    { label: "Cartons",          key: "purchased_carton" },
                    { label: "Recv. Cartons",    key: "received_carton" },
                    { label: "Damaged",          key: "damaged_carton" },
                    { label: "Profit % (÷)",     key: "profit_percentage" },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="text-xs text-gray-400 block mb-1">{label}</label>
                      <input
                        type="number" placeholder="0"
                        className="border border-gray-200 rounded-lg px-2.5 py-1.5 w-full text-sm text-right font-mono bg-white focus:outline-none focus:border-blue-400"
                        value={item[key as keyof PurchaseItemFormData]}
                        onChange={(e) =>
                          updateItem(i, key as keyof PurchaseItemFormData, e.target.value)
                        }
                      />
                    </div>
                  ))}

                  {/* Line total approx */}
                  <div className="text-right">
                    <label className="text-xs text-gray-400 block mb-1">Line Total</label>
                    <div className="text-sm font-mono font-semibold text-gray-800 py-1.5 px-2">
                      {fmt(
                        (parseFloat(item.unit_price) || 0) *
                        (parseFloat(item.purchased_carton) || 0)
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => removeItem(i)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove item
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes & Info</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <div className="grid grid-cols-1 gap-3 mb-6">
            {[
              { label: "LC Information",        key: "lc_information" },
              { label: "BIL Information",       key: "bil_information" },
              { label: "Container Information", key: "container_information" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-xs text-gray-400 block mb-1">{label}</label>
                <textarea
                  rows={2}
                  placeholder={label + "..."}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm bg-white focus:outline-none focus:border-blue-400 resize-none"
                  value={formData[key as keyof PurchaseFormData] as string}
                  onChange={(e) => setField(key as keyof PurchaseFormData, e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="w-64 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Product Total</span>
                <span className="font-mono text-xs text-gray-700">{fmt(productTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Additional Costs</span>
                <span className="font-mono text-xs text-gray-700">{fmt(costTotal)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                <span className="text-gray-700">Est. Total Cost</span>
                <span className="font-mono text-gray-900">{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 pb-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 hover:bg-blue-700"
          >
            {saving ? "Saving..." : "Save Purchase"}
          </button>
        </div>
      </div>
    </div>
  );
}
