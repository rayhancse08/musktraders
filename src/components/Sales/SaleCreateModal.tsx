"use client";
import React, { useEffect, useState, useRef } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import {
  SaleFormData, SaleItemFormData, ProductOption,
  StoreOption, BillingOption,
} from "@/types/sale";

type Props = {
  formData: SaleFormData;
  setFormData: React.Dispatch<React.SetStateAction<SaleFormData>>;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error: string | null;
};

const EMPTY_ITEM: SaleItemFormData = {
  product: "", product_name: "",
  quantity: "", packet_price: "", sale_price: "", discount: "",
};

export default function SaleCreateModal({
                                          formData, setFormData, onSave, onClose, saving, error,
                                        }: Props) {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [billing, setBilling] = useState<BillingOption[]>([]);
  const [searches, setSearches] = useState<string[]>([]);
  const [options, setOptions] = useState<ProductOption[][]>([]);
  const timerRefs = useRef<(ReturnType<typeof setTimeout> | null)[]>([]);

  const [storePage, setStorePage] = useState(1);
  const [billingPage, setBillingPage] = useState(1);

  useEffect(() => {
    const loadData = async () => {
      try {
        const storesRes = await apiFetch(
          `${getApiBase()}/stores/autocomplete/?page=${storePage}`
        );
        setStores(storesRes.results ?? storesRes);

        const billingRes = await apiFetch(
          `${getApiBase()}/billing-companies/?page=${billingPage}`
        );
        setBilling(billingRes.results ?? billingRes);

      } catch (e) {
        console.error(e);
      }
    };

    loadData();
  }, [storePage, billingPage]);

  const setField = (k: keyof SaleFormData, v: string) =>
    setFormData((p) => ({ ...p, [k]: v }));

  const addItem = () => {
    setFormData((p) => ({ ...p, sale_items: [...p.sale_items, { ...EMPTY_ITEM }] }));
    setSearches((p) => [...p, ""]);
    setOptions((p) => [...p, []]);
  };

  const removeItem = (i: number) => {
    setFormData((p) => ({ ...p, sale_items: p.sale_items.filter((_, j) => j !== i) }));
    setSearches((p) => p.filter((_, j) => j !== i));
    setOptions((p) => p.filter((_, j) => j !== i));
  };

  // FIX 1: removed auto price conversion — all fields are independent
  const updateItem = (i: number, k: keyof SaleItemFormData, v: string) => {
    setFormData((p) => {
      const items = [...p.sale_items];
      items[i] = { ...items[i], [k]: v };
      return { ...p, sale_items: items };
    });
  };

  // Round any decimal value to max 4 places before storing (API constraint)
  const d4 = (v: string | number) =>
    String(parseFloat(String(v || 0)).toFixed(4));

  // Clamp all decimal fields to 4dp before payload leaves the browser
  const DECIMAL_ITEM_KEYS: (keyof SaleItemFormData)[] = [
    "packet_price", "sale_price", "discount",
  ];
  const DECIMAL_FORM_KEYS: (keyof SaleFormData)[] = [
    "shipping_charge", "discount_amount",
  ];
  const handleSave = () => {
    setFormData((p) => ({
      ...p,
      ...Object.fromEntries(
        DECIMAL_FORM_KEYS.map((k) => [k, p[k] ? d4(p[k] as string) : p[k]])
      ),
      sale_items: p.sale_items.map((item) => ({
        ...item,
        ...Object.fromEntries(
          DECIMAL_ITEM_KEYS.map((k) => [k, item[k] ? d4(item[k]) : item[k]])
        ),
      })),
    }));
    onSave();
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
    updateItem(i, "packet_price", d4(p.packet_price));
    updateItem(i, "sale_price", d4(p.sale_price));
    const s = [...searches]; s[i] = p.name; setSearches(s);
    setOptions((prev) => { const a = [...prev]; a[i] = []; return a; });
  };

  // FIX 3: use sale_price (item.price does not exist on SaleItemFormData)
  const subTotal = formData.sale_items.reduce((acc, item) => {
    const price = parseFloat(item.sale_price) || 0;
    const disc  = parseFloat(item.discount)   || 0;
    const qty   = parseFloat(item.quantity)   || 0;
    return acc + (price - disc) * qty;
  }, 0);

  const ship  = parseFloat(formData.shipping_charge) || 0;
  const dAmt  = parseFloat(formData.discount_amount) || 0;
  const disc  = formData.discount_type === "percentage" ? subTotal * dAmt / 100 : dAmt;
  const total = subTotal - disc + ship;

  // FIX 4: currency symbol ৳ not $
  const fmt = (v: number) =>
    "৳" + v.toLocaleString("en-BD", { minimumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center py-8 overflow-y-auto px-4 mt-20">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl">

        {/* Header */}
        <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">New Sale Order</h2>
            <p className="text-sm text-gray-400 mt-0.5">Fill in order details and add items</p>
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

          {/* Header Fields */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { label: "Sale Date",     key: "date",          type: "date" },
              { label: "Delivery Date", key: "delivery_date", type: "date" },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  {label}
                </label>
                <input
                  type={type}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                  value={formData[key as keyof SaleFormData] as string}
                  onChange={(e) => setField(key as keyof SaleFormData, e.target.value)}
                />
              </div>
            ))}

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Store</label>
              <select
                className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                value={formData.store}
                onChange={(e) => setField("store", e.target.value)}
              >
                <option value="">Select store...</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Billing Company</label>
              <select
                className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                value={formData.billing_company}
                onChange={(e) => setField("billing_company", e.target.value)}
              >
                <option value="">Select company...</option>
                {billing.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Status</label>
              <select
                className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                value={formData.status}
                onChange={(e) => setField("status", e.target.value as any)}
              >
                <option value="confirmed">Confirmed</option>
                <option value="packing">Packing</option>
                <option value="delivering">Delivering</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Shipping Charge</label>
              <input
                type="number" placeholder="0.00"
                className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                value={formData.shipping_charge}
                onChange={(e) => setField("shipping_charge", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Discount Type</label>
              <select
                className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                value={formData.discount_type}
                onChange={(e) => setField("discount_type", e.target.value as any)}
              >
                <option value="flat">Flat Amount</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Discount Amount</label>
              <input
                type="number" placeholder="0"
                className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                value={formData.discount_amount}
                onChange={(e) => setField("discount_amount", e.target.value)}
              />
            </div>
          </div>

          {/* Items section */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sale Items</span>
            <div className="flex-1 h-px bg-gray-100" />
            <button
              onClick={addItem}
              className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg font-medium"
            >
              + Add Item
            </button>
          </div>

          {formData.sale_items.length === 0 && (
            <div className="border border-dashed border-gray-200 rounded-lg py-8 text-center text-sm text-gray-400 mb-4">
              No items yet — click "+ Add Item" to start
            </div>
          )}

          <div className="space-y-2 mb-5">
            {formData.sale_items.map((item, i) => (
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
                            Stock: {p.stocked_quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Numeric fields */}
                <div className="grid grid-cols-5 gap-2 items-end">
                  {[
                    { label: "Qty",        key: "quantity"     },
                    { label: "Pkt Price",  key: "packet_price" },
                    { label: "Sale Price", key: "sale_price"   },
                    { label: "Discount",   key: "discount"     },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="text-xs text-gray-400 block mb-1">{label}</label>
                      <input
                        type="number" placeholder="0"
                        className="border border-gray-200 rounded-lg px-2.5 py-1.5 w-full text-sm text-right font-mono bg-white focus:outline-none focus:border-blue-400"
                        value={item[key as keyof SaleItemFormData]}
                        onChange={(e) => updateItem(i, key as keyof SaleItemFormData, e.target.value)}
                      />
                    </div>
                  ))}

                  {/* FIX 5: line total uses sale_price, not item.price */}
                  <div className="text-right">
                    <label className="text-xs text-gray-400 block mb-1">Line Total</label>
                    <div className="text-sm font-mono font-semibold text-gray-800 py-1.5 px-2">
                      {fmt(
                        ((parseFloat(item.sale_price) || 0) - (parseFloat(item.discount) || 0)) *
                        (parseFloat(item.quantity) || 0)
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

          {/* Order summary */}
          <div className="flex justify-end">
            <div className="w-56 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm space-y-2">
              {[
                { label: "Sub Total", value: fmt(subTotal) },
                { label: "Discount",  value: "-" + fmt(disc), color: "text-red-500" },
                { label: "Shipping",  value: fmt(ship) },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-400">{label}</span>
                  <span className={`font-mono text-xs ${color ?? "text-gray-700"}`}>{value}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                <span className="text-gray-700">Total</span>
                <span className="font-mono text-gray-900">{fmt(total)}</span>
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
            {saving ? "Saving..." : "Save Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
