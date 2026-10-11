"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import {
  BillingOption,
  ProductOption,
  SaleDetail,
  SaleItemFormData,
  SaleStatus,
  StoreOption,
} from "@/types/sale";

const STATUS_OPTS: SaleStatus[] = [
  "confirmed",
  "packing",
  "delivering",
  "delivered",
  "cancelled",
];

const EMPTY_ITEM: SaleItemFormData = {
  product: "",
  product_name: "",
  quantity: "",
  packet_price: "",
  sale_price: "",
  discount: "",
};

const fmtMoney = (v: string | number | null | undefined) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n)
    ? "$" + n.toLocaleString("en-BD", { minimumFractionDigits: 2 })
    : "—";
};

const d4 = (v: string | number) => String(parseFloat(String(v || 0)).toFixed(4));

type EditableSale = {
  id: number;
  order_no: string;
  store: string;
  store_name?: string;
  billing_company: string;
  date: string;
  delivery_date: string;
  status: SaleStatus;
  shipping_charge: string;
  discount_type: "flat" | "percentage";
  discount_amount: string;
  sale_items: SaleItemFormData[];
};

type Props = {
  sale: SaleDetail | null;
  loading: boolean;
  saving?: boolean;
  onClose: () => void;
  onStatusChange: (id: number, status: string) => void;
  onAddPayment: (saleId: number, amount: string, date: string) => void;
  onSaveEdit: (saleId: number, payload: EditableSale) => void;
};

export default function SaleDetailModal({
                                          sale,
                                          loading,
                                          saving = false,
                                          onClose,
                                          onStatusChange,
                                          onAddPayment,
                                          onSaveEdit,
                                        }: Props) {
  const [tab, setTab] = useState<"items" | "payments" | "summary">("items");
  const [payAmt, setPayAmt] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));

  const [stores, setStores] = useState<StoreOption[]>([]);
  const [billing, setBilling] = useState<BillingOption[]>([]);
  const [searches, setSearches] = useState<string[]>([]);
  const [options, setOptions] = useState<ProductOption[][]>([]);
  const timerRefs = useRef<(ReturnType<typeof setTimeout> | null)[]>([]);

  const [draft, setDraft] = useState<EditableSale | null>(null);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [storesRes, billingRes] = await Promise.all([
          apiFetch(`${getApiBase()}/stores/autocomplete/`),
          apiFetch(`${getApiBase()}/billing-companies/`),
        ]);
        setStores(storesRes.results ?? storesRes);
        setBilling(billingRes.results ?? billingRes);
      } catch (e) {
        console.error(e);
      }
    };

    loadMeta();
  }, []);

  useEffect(() => {
    if (!sale) {
      setDraft(null);
      setSearches([]);
      setOptions([]);
      return;
    }

    const items: SaleItemFormData[] = sale.sale_items.map((item) => ({
      product: String(item.product ?? ""),
      product_name: item.product_name ?? "",
      quantity: String(item.quantity ?? ""),
      packet_price: String(item.packet_price ?? ""),
      sale_price: String(item.price ?? item.price ?? ""),
      discount: String(item.discount ?? ""),
    }));

    setDraft({
      id: sale.id,
      order_no: sale.order_no ?? "",
      store: String(sale.store ?? ""),
      store_name: sale.store_name ?? "",
      billing_company: String(sale.billing_company ?? ""),
      date: sale.date ?? "",
      delivery_date: sale.delivery_date ?? "",
      status: sale.status,
      shipping_charge: String(sale.shipping_charge ?? ""),
      discount_type: (sale.discount_type as "flat" | "percentage") ?? "flat",
      discount_amount: String(sale.discount ?? sale.discount_amount ?? ""),
      sale_items: items,
    });

    setSearches(items.map((item) => item.product_name || ""));
    setOptions(items.map(() => []));
  }, [sale]);

  const setField = (k: keyof EditableSale, v: string) => {
    setDraft((prev) => (prev ? { ...prev, [k]: v } : prev));
  };

  const updateItem = (i: number, k: keyof SaleItemFormData, v: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const items = [...prev.sale_items];
      items[i] = { ...items[i], [k]: v };
      return { ...prev, sale_items: items };
    });
  };

  const addItem = () => {
    setDraft((prev) =>
      prev ? { ...prev, sale_items: [...prev.sale_items, { ...EMPTY_ITEM }] } : prev
    );
    setSearches((prev) => [...prev, ""]);
    setOptions((prev) => [...prev, []]);
  };

  const removeItem = (i: number) => {
    setDraft((prev) =>
      prev
        ? {
          ...prev,
          sale_items: prev.sale_items.filter((_, j) => j !== i),
        }
        : prev
    );

    setSearches((prev) => prev.filter((_, j) => j !== i));
    setOptions((prev) => prev.filter((_, j) => j !== i));
  };


  const searchProducts = (i: number, q: string) => {
    const arr = [...searches];
    arr[i] = q;
    setSearches(arr);

    if (timerRefs.current[i]) clearTimeout(timerRefs.current[i]!);

    timerRefs.current[i] = setTimeout(async () => {
      if (!q.trim()) {
        setOptions((prev) => {
          const next = [...prev];
          next[i] = [];
          return next;
        });
        return;
      }

      try {
        const res = await apiFetch(
          `${getApiBase()}/products/autocomplete/?q=${encodeURIComponent(q)}`
        );

        const items: ProductOption[] = res?.results ?? res ?? [];

        setOptions((prev) => {
          const next = [...prev];
          next[i] = Array.isArray(items) ? items : [];
          return next;
        });
      } catch (e) {
        console.error(e);
        setOptions((prev) => {
          const next = [...prev];
          next[i] = [];
          return next;
        });
      }
    }, 300);
  };


  const selectProduct = (i: number, p: ProductOption) => {
    updateItem(i, "product", String(p.id));
    updateItem(i, "product_name", p.name);
    updateItem(i, "packet_price", d4(p.packet_price));
    updateItem(i, "sale_price", d4(p.sale_price));

    setSearches((prev) => {
      const next = [...prev];
      next[i] = p.name;
      return next;
    });

    setOptions((prev) => {
      const next = [...prev];
      next[i] = [];
      return next;
    });
  };

  const handleSaveEdit = () => {
    if (!draft) return;

    const payload: EditableSale = {
      ...draft,
      shipping_charge: draft.shipping_charge ? d4(draft.shipping_charge) : "",
      discount_amount: draft.discount_amount ? d4(draft.discount_amount) : "",
      sale_items: draft.sale_items.map((item) => ({
        ...item,
        packet_price: item.packet_price ? d4(item.packet_price) : "",
        sale_price: item.sale_price ? d4(item.sale_price) : "",
        discount: item.discount ? d4(item.discount) : "",
      })),
    };

    onSaveEdit(draft.id, payload);
  };

  const subTotal = (draft?.sale_items ?? []).reduce((acc, item) => {
    const price = parseFloat(item.sale_price) || 0;
    const disc = parseFloat(item.discount) || 0;
    const qty = parseFloat(item.quantity) || 0;
    return acc + (price - disc) * qty;
  }, 0);

  const ship = parseFloat(draft?.shipping_charge ?? "") || 0;
  const dAmt = parseFloat(draft?.discount_amount ?? "") || 0;
  const orderDiscount =
    draft?.discount_type === "percentage" ? (subTotal * dAmt) / 100 : dAmt;
  const total = subTotal - orderDiscount + ship;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center py-8 overflow-y-auto px-4 mt-20">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl">
        <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Order {sale?.order_no ?? "..."}
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {sale?.store_name} · {sale?.date}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {sale && (
              <Link
                href={`/sales/${sale.id}/invoice`}
                className="rounded-lg border border-[#0F3D3A] px-3 py-1.5 text-sm font-medium text-[#0F3D3A] hover:bg-[#0F3D3A] hover:text-white"
              >
                Invoice
              </Link>
            )}
            {sale && (
              <select
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                value={sale.status}
                onChange={(e) => onStatusChange(sale.id, e.target.value)}
              >
                {STATUS_OPTS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-7 py-6">
          {loading && <div className="text-center py-16 text-gray-400">Loading...</div>}

          {!loading && sale && draft && (
            <>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-5">
                {(["items", "payments", "summary"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-5 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                      tab === t
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t}
                    {t === "payments" && sale?.sale_payments?.length > 0 && (
                      <span className="ml-1.5 bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">
                        {sale.sale_payments.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {tab === "items" && (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      { label: "Sale Date", key: "date", type: "date" },
                      { label: "Delivery Date", key: "delivery_date", type: "date" },
                    ].map(({ label, key, type }) => (
                      <div key={key}>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                          {label}
                        </label>
                        <input
                          type={type}
                          className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                          value={draft[key as keyof EditableSale] as string}
                          onChange={(e) =>
                            setField(key as keyof EditableSale, e.target.value)
                          }
                        />
                      </div>
                    ))}

                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                        Store
                      </label>
                      <select
                        className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                        value={draft.store}
                        onChange={(e) => setField("store", e.target.value)}
                      >
                        <option value="">Select store...</option>
                        {stores.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                        Billing Company
                      </label>
                      <select
                        className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                        value={draft.billing_company}
                        onChange={(e) => setField("billing_company", e.target.value)}
                      >
                        <option value="">Select company...</option>
                        {billing.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                        Shipping Charge
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                        value={draft.shipping_charge}
                        onChange={(e) => setField("shipping_charge", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                        Discount Type
                      </label>
                      <select
                        className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                        value={draft.discount_type}
                        onChange={(e) => setField("discount_type", e.target.value)}
                      >
                        <option value="flat">Flat Amount</option>
                        <option value="percentage">Percentage</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                        Discount Amount
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                        value={draft.discount_amount}
                        onChange={(e) => setField("discount_amount", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Sale Items
                    </span>
                    <div className="flex-1 h-px bg-gray-100" />
                    <button
                      onClick={addItem}
                      className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg font-medium"
                    >
                      + Add Item
                    </button>
                  </div>

                  {draft.sale_items.length === 0 && (
                    <div className="border border-dashed border-gray-200 rounded-lg py-8 text-center text-sm text-gray-400 mb-4">
                      No items yet — click "+ Add Item" to start
                    </div>
                  )}

                  <div className="space-y-2 mb-5">
                    {draft.sale_items.map((item, i) => (
                      <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
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

                        <div className="grid grid-cols-5 gap-2 items-end">
                          {[
                            { label: "Qty", key: "quantity" },
                            { label: "Pkt Price", key: "packet_price" },
                            { label: "Sale Price", key: "sale_price" },
                            { label: "Discount", key: "discount" },
                          ].map(({ label, key }) => (
                            <div key={key}>
                              <label className="text-xs text-gray-400 block mb-1">
                                {label}
                              </label>
                              <input
                                type="number"
                                placeholder="0"
                                className="border border-gray-200 rounded-lg px-2.5 py-1.5 w-full text-sm text-right font-mono bg-white focus:outline-none focus:border-blue-400"
                                value={item[key as keyof SaleItemFormData]}
                                onChange={(e) =>
                                  updateItem(
                                    i,
                                    key as keyof SaleItemFormData,
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          ))}

                          <div className="text-right">
                            <label className="text-xs text-gray-400 block mb-1">
                              Line Total
                            </label>
                            <div className="text-sm font-mono font-semibold text-gray-800 py-1.5 px-2">
                              {fmtMoney(
                                ((parseFloat(item.sale_price) || 0) -
                                  (parseFloat(item.discount) || 0)) *
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

                  <div className="flex justify-end">
                    <div className="w-56 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm space-y-2">
                      {[
                        { label: "Sub Total", value: fmtMoney(subTotal) },
                        {
                          label: "Discount",
                          value: "-" + fmtMoney(orderDiscount),
                          color: "text-red-500",
                        },
                        { label: "Shipping", value: fmtMoney(ship) },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex justify-between">
                          <span className="text-gray-400">{label}</span>
                          <span className={`font-mono text-xs ${color ?? "text-gray-700"}`}>
                            {value}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                        <span className="text-gray-700">Total</span>
                        <span className="font-mono text-gray-900">{fmtMoney(total)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {tab === "payments" && (
                <div>
                  <div className="space-y-2 mb-5">
                    {sale?.sale_payments?.length === 0 && (
                      <p className="text-center py-8 text-gray-400 text-sm">
                        No payments recorded
                      </p>
                    )}
                    {sale.sale_payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-sm text-gray-700">{p.date}</span>
                          {p.note && (
                            <span className="text-xs text-gray-400">{p.note}</span>
                          )}
                        </div>
                        <span className="font-mono font-semibold text-emerald-700">
                          {fmtMoney(p.amount)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Record Payment
                    </p>
                    <div className="grid grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Amount</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                          value={payAmt}
                          onChange={(e) => setPayAmt(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Date</label>
                        <input
                          type="date"
                          className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400"
                          value={payDate}
                          onChange={(e) => setPayDate(e.target.value)}
                        />
                      </div>
                      <button
                        onClick={() => {
                          onAddPayment(sale.id, payAmt, payDate);
                          setPayAmt("");
                        }}
                        className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
                      >
                        Add Payment
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {tab === "summary" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Order Totals
                    </p>
                    {[
                      { label: "Sub Total", value: fmtMoney(subTotal) },
                      {
                        label: "Discount",
                        value: "-" + fmtMoney(orderDiscount),
                        color: "text-red-500",
                      },
                      { label: "Shipping", value: fmtMoney(ship) },
                      { label: "Total", value: fmtMoney(total), bold: true },
                    ].map(({ label, value, color, bold }) => (
                      <div
                        key={label}
                        className="flex justify-between py-2 border-b border-gray-200 last:border-0"
                      >
                        <span className="text-sm text-gray-500">{label}</span>
                        <span
                          className={`font-mono text-sm font-medium ${
                            color ?? "text-gray-800"
                          } ${bold ? "font-bold text-base" : ""}`}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Payment Status
                    </p>
                    {[
                      {
                        label: "Total Paid",
                        value: fmtMoney(sale.payment),
                        color: "text-emerald-600",
                      },
                      {
                        label: "Amount Due",
                        value:
                          parseFloat(String(sale.payment_due)) > 0
                            ? fmtMoney(sale.payment_due)
                            : "Fully paid ✓",
                        color:
                          parseFloat(String(sale.payment_due)) > 0
                            ? "text-orange-500"
                            : "text-gray-400",
                      },
                      {
                        label: "Profit",
                        value: fmtMoney(sale.profit),
                        color: "text-blue-600",
                      },
                    ].map(({ label, value, color }) => (
                      <div
                        key={label}
                        className="flex justify-between py-2 border-b border-gray-200 last:border-0"
                      >
                        <span className="text-sm text-gray-500">{label}</span>
                        <span className={`font-mono text-sm font-medium ${color}`}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-7 pb-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
          {sale && draft && tab === "items" && (
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 hover:bg-blue-700"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
