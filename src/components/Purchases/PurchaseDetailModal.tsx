"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { PurchaseDetail } from "@/types/purchase";
import { PRICE_FIELD_KEYS, PriceFields, syncPriceFields } from "@/lib/purchase-math";

const fmt = (v: string | number | null | undefined) =>
  v !== null && v !== undefined && v !== ""
    ? "$" + Number(v).toLocaleString("en-BD", { minimumFractionDigits: 2 })
    : "—";

const num4 = (v: string | number | null | undefined) =>
  v !== null && v !== undefined && v !== "" ? Number(v).toFixed(4) : "—";

const plain = (v: string | number | null | undefined) =>
  v !== null && v !== undefined && v !== "" ? String(v) : "—";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ITEM_COLUMNS = [
  "Product",
  "Unit price",
  "Total unit price",
  "Purchased carton",
  "Received carton",
  "Damaged carton",
  "Profit percentage",
  "Carton price",
  "Carton total price",
  "Sale price",
  "Total price",
];

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[200px_1fr] items-baseline gap-4 border-b border-gray-100 px-2 py-3 text-sm">
      <span className="text-gray-600">{label}:</span>
      <span className="text-gray-800 whitespace-pre-line">{value}</span>
    </div>
  );
}

function PurchaseOverview({ purchase }: { purchase: PurchaseDetail }) {
  const costRows: { label: string; value: string }[] = [
    { label: "Total carton", value: plain(purchase.total_carton) },
    { label: "Total CBM", value: num4(purchase.total_cbm) },
    { label: "Total product price", value: num4(purchase.total_product_price) },
    { label: "Shipping cost", value: num4(purchase.shipping_cost) },
    { label: "Food quality control cost", value: num4(purchase.food_quality_control_cost) },
    { label: "Container clearing cost", value: num4(purchase.container_clearing_cost) },
    { label: "Lorry shipping cost", value: num4(purchase.lory_shipping_cost) },
    { label: "Labourer handling cost", value: num4(purchase.labourer_handling_cost) },
    { label: "Warehouse rent", value: num4(purchase.warehouse_rent) },
    { label: "Employee salary", value: num4(purchase.employee_salary) },
    { label: "Warehouse other cost", value: num4(purchase.warehouse_other_cost) },
    { label: "Carton handling cost", value: num4(purchase.carton_handling_cost) },
    { label: "Total purchase cost", value: num4(purchase.total_purchase_cost) },
    { label: "Profit margin", value: num4(purchase.profit_margin) },
    { label: "Expected sales", value: num4(purchase.expected_sales) },
    { label: "Expected profit", value: num4(purchase.expected_profit) },
    { label: "Paid", value: num4(purchase.payment) },
    { label: "Payment due", value: num4(purchase.payment_due) },
  ];

  return (
    <div className="text-gray-800">
      <InfoRow label="Date" value={formatDate(purchase.date)} />
      <InfoRow label="Receive date" value={formatDate(purchase.receive_date)} />
      <InfoRow label="Vendor" value={purchase.vendor_name ?? "—"} />
      <InfoRow label="Lot number" value={purchase.lot_number || "—"} />

      <p className="px-2 pb-2 pt-5 text-sm text-gray-600">Purchase items:</p>
      <div className="overflow-x-auto border border-gray-200">
        <div className="bg-[#79aec8] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white">
          Purchase items
        </div>
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {ITEM_COLUMNS.map((col, i) => (
                <th
                  key={col}
                  className={`px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-gray-500 ${
                    i === 0 ? "text-left" : "text-center"
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {purchase.purchase_items.length === 0 && (
              <tr>
                <td colSpan={ITEM_COLUMNS.length} className="px-3 py-8 text-center text-gray-400">
                  No purchase items
                </td>
              </tr>
            )}
            {purchase.purchase_items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 align-middle">
                <td className="px-3 py-3">
                  <div className="text-gray-700">{purchase.lot_number}</div>
                  <div className="font-medium text-gray-900">{item.product_name}</div>
                </td>
                <td className="px-3 py-3 text-center">{num4(item.unit_price)}</td>
                <td className="px-3 py-3 text-center">{num4(item.total_unit_price)}</td>
                <td className="px-3 py-3 text-center">{plain(item.purchased_carton)}</td>
                <td className="px-3 py-3 text-center">{plain(item.received_carton)}</td>
                <td className="px-3 py-3 text-center">{plain(item.damaged_carton)}</td>
                <td className="px-3 py-3 text-center">{num4(item.profit_percentage)}</td>
                <td className="px-3 py-3 text-center">{num4(item.carton_price)}</td>
                <td className="px-3 py-3 text-center">{num4(item.carton_total_price)}</td>
                <td className="px-3 py-3 text-center">{num4(item.sale_price)}</td>
                <td className="px-3 py-3 text-center">{num4(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        {costRows.map(({ label, value }) => (
          <InfoRow key={label} label={label} value={value} />
        ))}
        <InfoRow label="LC information" value={purchase.lc_information || "—"} />
        <InfoRow label="BIL information" value={purchase.bil_information || "—"} />
        <InfoRow label="Container information" value={purchase.container_information || "—"} />
      </div>

      {purchase.purchase_payments.length > 0 && (
        <>
          <p className="px-2 pb-2 pt-5 text-sm text-gray-600">Payments:</p>
          <div className="border border-gray-200">
            <div className="bg-[#79aec8] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white">
              Purchase payments
            </div>
            {purchase.purchase_payments.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[200px_1fr_auto] gap-4 border-b border-gray-100 px-3 py-2.5 text-sm last:border-0"
              >
                <span className="text-gray-600">{formatDate(p.date)}</span>
                <span className="text-gray-500">{p.note || p.account_information || ""}</span>
                <span className="font-medium">{num4(p.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type ProductOption = {
  id: number;
  name: string;
  stocked_quantity?: string | number;
  sale_price?: string;
  packet_price?: string;
  packet_per_carton?: string | number;
};

type DraftPurchaseItem = {
  id?: number;
  _key: string;
  product: string;
  product_name: string;
  packet_per_carton: string;
  unit_price: string;
  carton_price: string;
  line_total: string;
  cbm: string;
  purchased_carton: string;
  received_carton: string;
  damaged_carton: string;
  profit_percentage: string;
};

type DraftPurchase = {
  id: number;
  date: string;
  vendor: string;
  vendor_name?: string;
  lot_number: string;
  lc_information: string;
  bil_information: string;
  container_information: string;
  shipping_cost: string;
  food_quality_control_cost: string;
  container_clearing_cost: string;
  lory_shipping_cost: string;
  labourer_handling_cost: string;
  warehouse_rent: string;
  employee_salary: string;
  warehouse_other_cost: string;
  purchase_items: DraftPurchaseItem[];
};

type Props = {
  purchase: PurchaseDetail | null;
  loading: boolean;
  saving?: boolean;
  onClose: () => void;
  onAddPayment: (purchaseId: number, amount: string, date: string) => void;
  onSaveEdit: (purchaseId: number, payload: DraftPurchase) => Promise<boolean>;
  onAddPurchase: () => void;
};

type CostFieldKey =
  | "shipping_cost"
  | "food_quality_control_cost"
  | "container_clearing_cost"
  | "lory_shipping_cost"
  | "labourer_handling_cost"
  | "warehouse_rent"
  | "employee_salary"
  | "warehouse_other_cost";

const COST_LABELS: { label: string; key: CostFieldKey }[] = [
  { label: "Shipping Cost", key: "shipping_cost" },
  { label: "Food Quality Control", key: "food_quality_control_cost" },
  { label: "Container Clearing", key: "container_clearing_cost" },
  { label: "Lorry Shipping", key: "lory_shipping_cost" },
  { label: "Labourer Handling", key: "labourer_handling_cost" },
  { label: "Warehouse Rent", key: "warehouse_rent" },
  { label: "Employee Salary", key: "employee_salary" },
  { label: "Other Costs", key: "warehouse_other_cost" },
];


const makeItemKey = () => `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const EMPTY_ITEM: DraftPurchaseItem = {
  _key: makeItemKey(),
  product: "",
  product_name: "",
  packet_per_carton: "",
  unit_price: "",
  carton_price: "",
  line_total: "",
  cbm: "",
  purchased_carton: "",
  received_carton: "",
  damaged_carton: "",
  profit_percentage: "",
};

export default function PurchaseDetailModal({
                                              purchase,
                                              loading,
                                              saving = false,
                                              onClose,
                                              onAddPayment,
                                              onSaveEdit,
                                              onAddPurchase,
                                            }: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [tab, setTab] = useState<"items" | "costs" | "payments" | "notes">("items");

  useEffect(() => {
    setMode("view");
    setTab("items");
  }, [purchase?.id]);
  const [payAmt, setPayAmt] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));

  const [draft, setDraft] = useState<DraftPurchase | null>(null);
  const [searches, setSearches] = useState<string[]>([]);
  const [options, setOptions] = useState<ProductOption[][]>([]);
  const timerRefs = useRef<(ReturnType<typeof setTimeout> | null)[]>([]);

  useEffect(() => {
    if (!purchase) {
      setDraft(null);
      setSearches([]);
      setOptions([]);
      return;
    }

    const items: DraftPurchaseItem[] = purchase.purchase_items.map((item) => ({
      id: item.id,
      _key: `existing-${item.id}`,
      product: String(item.product ?? ""),
      product_name: item.product_name ?? "",
      packet_per_carton: String(item.packet_per_carton ?? ""),
      unit_price: String(item.unit_price ?? ""),
      carton_price: String(item.carton_price ?? ""),
      line_total: String(item.line_total ?? ""),
      cbm: item.cbm ?? "",
      purchased_carton: String(item.purchased_carton ?? ""),
      received_carton: String(item.received_carton ?? ""),
      damaged_carton: String(item.damaged_carton ?? ""),
      profit_percentage: item.profit_percentage ?? "",
    }));

    setDraft({
      id: purchase.id,
      date: purchase.date ?? "",
      vendor: String(purchase.vendor ?? ""),
      vendor_name: purchase.vendor_name ?? "",
      lot_number: purchase.lot_number ?? "",
      lc_information: purchase.lc_information ?? "",
      bil_information: purchase.bil_information ?? "",
      container_information: purchase.container_information ?? "",
      shipping_cost: String(purchase.shipping_cost ?? ""),
      food_quality_control_cost: String(purchase.food_quality_control_cost ?? ""),
      container_clearing_cost: String(purchase.container_clearing_cost ?? ""),
      lory_shipping_cost: String(purchase.lory_shipping_cost ?? ""),
      labourer_handling_cost: String(purchase.labourer_handling_cost ?? ""),
      warehouse_rent: String(purchase.warehouse_rent ?? ""),
      employee_salary: String(purchase.employee_salary ?? ""),
      warehouse_other_cost: String(purchase.warehouse_other_cost ?? ""),
      purchase_items: items,
    });

    setSearches(items.map((item) => item.product_name || ""));
    setOptions(items.map(() => []));
  }, [purchase]);

  const setField = (key: keyof DraftPurchase, value: string) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateItem = (i: number, key: keyof DraftPurchaseItem, value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const items = [...prev.purchase_items];
      const edited = { ...items[i], [key]: value };
      items[i] = PRICE_FIELD_KEYS.includes(key as keyof PriceFields)
        ? syncPriceFields(edited, key as keyof PriceFields)
        : edited;
      return { ...prev, purchase_items: items };
    });
  };

  const addItem = () => {
    setDraft((prev) =>
      prev
        ? {
          ...prev,
          purchase_items: [
            ...prev.purchase_items,
            {
              ...EMPTY_ITEM,
              _key: makeItemKey(),
            },
          ],
        }
        : prev
    );
    setSearches((prev) => [...prev, ""]);
    setOptions((prev) => [...prev, []]);
  };

  const removeItem = (i: number) => {
    setDraft((prev) =>
      prev
        ? {
          ...prev,
          purchase_items: prev.purchase_items.filter((_, j) => j !== i),
        }
        : prev
    );
    setSearches((prev) => prev.filter((_, j) => j !== i));
    setOptions((prev) => prev.filter((_, j) => j !== i));
  };

  const searchProducts = (i: number, q: string) => {
    setSearches((prev) => {
      const next = [...prev];
      next[i] = q;
      return next;
    });

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
      }
    }, 300);
  };

  const selectProduct = (i: number, p: ProductOption) => {
    updateItem(i, "product", String(p.id));
    updateItem(i, "product_name", p.name);
    updateItem(i, "packet_per_carton", String(p.packet_per_carton ?? ""));

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

  const handleSave = async () => {
    if (!draft) return;
    const saved = await onSaveEdit(draft.id, draft);
    if (saved) setMode("view");
  };

  const totalCartons = (draft?.purchase_items ?? []).reduce(
    (sum, item) => sum + (parseFloat(item.purchased_carton) || 0),
    0
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center py-8 overflow-y-auto px-4 mt-20">
      <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl">
        <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {purchase?.lot_number ?? "Loading..."}
              </h2>
              {draft && mode === "edit" && (
                <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">
                  {totalCartons} cartons
                </span>
              )}
            </div>
            {mode === "edit" && (
              <p className="text-sm text-gray-400 mt-0.5">
                {purchase?.vendor_name ?? "—"} · {purchase?.date ?? "—"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {purchase && mode === "view" && (
              <>
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  className="rounded-full bg-gray-400 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-[#417690]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={onAddPurchase}
                  className="rounded-full bg-gray-400 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-[#417690]"
                >
                  Add purchase
                </button>
                <Link
                  href={`/purchases/${purchase.id}/invoice`}
                  className="rounded-full bg-gray-400 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-[#417690]"
                >
                  Generate invoice
                </Link>
              </>
            )}
            {purchase && mode === "edit" && (
              <button
                type="button"
                onClick={() => setMode("view")}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel edit
              </button>
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

          {!loading && purchase && mode === "view" && <PurchaseOverview purchase={purchase} />}

          {!loading && purchase && draft && mode === "edit" && (
            <>
              <div className="grid grid-cols-5 gap-3 mb-6">
                {[
                  { label: "Product Total", value: fmt(purchase.total_product_price), color: "text-gray-800" },
                  { label: "Total Cost", value: fmt(purchase.total_purchase_cost), color: "text-gray-800" },
                  { label: "Paid", value: fmt(purchase.payment), color: "text-emerald-600" },
                  {
                    label: "Due",
                    value: parseFloat(purchase.payment_due) > 0 ? fmt(purchase.payment_due) : "✓ Paid",
                    color: parseFloat(purchase.payment_due) > 0 ? "text-orange-500" : "text-gray-400",
                  },
                  { label: "Exp. Profit", value: fmt(purchase.expected_profit), color: "text-blue-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-xs text-gray-400 mb-1">{label}</div>
                    <div className={`font-mono font-semibold text-sm ${color}`}>{value}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-5">
                {(["items", "costs", "payments", "notes"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-5 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                      tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t}
                    {t === "payments" && purchase.purchase_payments.length > 0 && (
                      <span className="ml-1.5 bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">
                        {purchase.purchase_payments.length}
                      </span>
                    )}
                    {t === "items" && (
                      <span className="ml-1.5 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                        {draft.purchase_items.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {tab === "items" && (
                <div>
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

                  <div className="space-y-3">
                    {draft.purchase_items.map((item, i) => (
                      <div key={item._key} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
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
                                  onMouseDown={() => selectProduct(i, p)}
                                >
                                  <span className="font-medium text-gray-800">{p.name}</span>
                                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                    Stock: {p.stocked_quantity ?? "—"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-5 gap-2 items-end">
                          {[
                            { label: "Pcs/Ctn", key: "packet_per_carton" },
                            { label: "Price / pc", key: "unit_price" },
                            { label: "Carton Price", key: "carton_price" },
                            { label: "Purchased", key: "purchased_carton" },
                            { label: "Total Price", key: "line_total" },
                            { label: "CBM / Ctn", key: "cbm" },
                            { label: "Received", key: "received_carton" },
                            { label: "Damaged", key: "damaged_carton" },
                            { label: "Profit % (÷)", key: "profit_percentage" },
                          ].map(({ label, key }) => (
                            <div key={key}>
                              <label className="text-xs text-gray-400 block mb-1">{label}</label>
                              <input
                                type="number"
                                placeholder="0"
                                readOnly={key === "packet_per_carton"}
                                className="border border-gray-200 rounded-lg px-2.5 py-1.5 w-full text-sm text-right font-mono bg-white read-only:bg-gray-100 focus:outline-none focus:border-blue-400"
                                value={item[key as keyof DraftPurchaseItem]}
                                onChange={(e) =>
                                  updateItem(i, key as keyof DraftPurchaseItem, e.target.value)
                                }
                              />
                            </div>
                          ))}
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
                </div>
              )}

              {tab === "costs" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Import & Logistics Costs
                    </p>
                    {COST_LABELS.map(({ label, key }) => (
                      <div
                        key={key}
                        className="flex justify-between py-2 border-b border-gray-200 last:border-0 items-center gap-3"
                      >
                        <span className="text-sm text-gray-500">{label}</span>
                        <input
                          type="number"
                          className="border border-gray-200 rounded-lg px-3 py-1.5 w-40 text-sm text-right font-mono bg-white focus:outline-none focus:border-blue-400"
                          value={draft[key]}
                          onChange={(e) => setField(key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Summary
                    </p>
                    {[
                      { label: "Product Total", value: fmt(purchase.total_product_price) },
                      { label: "Total Purchase Cost", value: fmt(purchase.total_purchase_cost), bold: true },
                      { label: "Carton Handling Cost", value: fmt(purchase.carton_handling_cost) },
                      { label: "Total Cartons", value: String(purchase.total_carton ?? "—") },
                      { label: "Expected Sales", value: fmt(purchase.expected_sales), color: "text-blue-600" },
                      { label: "Expected Profit", value: fmt(purchase.expected_profit), color: "text-emerald-600" },
                    ].map(({ label, value, bold, color }) => (
                      <div key={label} className="flex justify-between py-2 border-b border-gray-200 last:border-0">
                        <span className="text-sm text-gray-500">{label}</span>
                        <span
                          className={`font-mono text-sm font-medium ${color ?? "text-gray-800"} ${
                            bold ? "font-bold text-base" : ""
                          }`}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "payments" && (
                <div>
                  <div className="space-y-2 mb-5">
                    {purchase.purchase_payments.length === 0 && (
                      <p className="text-center py-8 text-gray-400 text-sm">No payments recorded</p>
                    )}
                    {purchase.purchase_payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-sm text-gray-700">{p.date}</span>
                          {p.note && <span className="text-xs text-gray-400">{p.note}</span>}
                          {p.account_information && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                              {p.account_information}
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-semibold text-emerald-700">
                          {fmt(p.amount)}
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
                          onAddPayment(purchase.id, payAmt, payDate);
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

              {tab === "notes" && (
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { label: "LC Information", key: "lc_information" },
                    { label: "BIL Information", key: "bil_information" },
                    { label: "Container Information", key: "container_information" },
                  ].map(({ label, key }) => (
                    <div key={key} className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        {label}
                      </p>
                      <textarea
                        className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm bg-white focus:outline-none focus:border-blue-400 min-h-28"
                        value={draft[key as keyof DraftPurchase] as string}
                        onChange={(e) => setField(key as keyof DraftPurchase, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-7 pb-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
          {draft && mode === "edit" && (
            <button
              onClick={handleSave}
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
