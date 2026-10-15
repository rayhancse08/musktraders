"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueries, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import { usd as money } from "@/lib/format-number";
import { defaultCompanyId } from "@/lib/default-company";
import { roundTo } from "@/lib/purchase-math";
import {
  SALE_STATUSES, calcSale, calcSaleItem, cartonPrice, fifoAllocate, resolveItemDiscount,
} from "@/lib/sale-math";
import { availableLotsQuery, useDeleteSale, useSaveSale } from "@/hooks/useSales";
import { DangerButton, SecondaryButton } from "@/components/inventory/ui-primitives";
import { Modal } from "@/components/inventory/modal";
import { AsyncSelect } from "@/components/inventory/async-select";
import { Computed, Field, NumberInput, Section, SummaryRow } from "@/components/inventory/form-parts";
import {
  AvailableLot, BillingOption, ProductOption, SaleDetail, SaleFormData, SaleItemFormData, SalePaymentFormData,
  StoreOption,
} from "@/types/sale";
import { STATUS_STYLES } from "./status";

const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
const newKey = () => Math.random().toString(36).slice(2, 10);
const toNum = (v: string | null | undefined) => {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : 0;
};
const toInt = (v: string | null | undefined) => Math.trunc(toNum(v));
const blankIfZero = (v: string | null | undefined) => (v == null || Number(v) === 0 ? "" : String(Number(v)));
const lotName = (lot: AvailableLot) => lot.lot_number || `Stock #${lot.warehouse_item}`;

const loadStores = async (q: string): Promise<StoreOption[]> => {
  const res = await apiFetch(`${getApiBase()}/stores/autocomplete/?q=${encodeURIComponent(q)}`);
  return res.results ?? res;
};

const loadProducts = async (q: string): Promise<ProductOption[]> => {
  const res = await apiFetch(`${getApiBase()}/products/autocomplete/?q=${encodeURIComponent(q)}`);
  return res.results ?? res;
};

const emptyItem = (): SaleItemFormData => ({
  key: newKey(),
  product: "",
  product_name: "",
  packet_per_carton: "",
  product_discount_type: "percentage",
  product_discount: "",
  quantity: "",
  packet_price: "",
  discount: "",
  manual_lots: false,
  lots: {},
});

const emptyPayment = (): SalePaymentFormData => ({
  key: newKey(),
  date: today(),
  amount: "",
  account_information: "",
  note: "",
});

function toFormData(s?: SaleDetail | null): SaleFormData {
  if (!s) {
    return {
      date: today(),
      delivery_date: "",
      store: "",
      store_name: "",
      billing_company: "",
      status: "confirmed",
      shipping_charge: "",
      discount_type: "percentage",
      discount_amount: "",
      sale_items: [emptyItem()],
      sale_payments: [],
    };
  }
  return {
    date: s.date,
    delivery_date: s.delivery_date ?? "",
    store: String(s.store),
    store_name: s.store_name,
    billing_company: s.billing_company ? String(s.billing_company) : "",
    status: s.status,
    shipping_charge: blankIfZero(s.shipping_charge),
    discount_type: s.discount_type,
    discount_amount: blankIfZero(s.discount_amount),
    sale_items: s.sale_items.map((item) => ({
      key: `item-${item.id}`,
      id: item.id,
      product: String(item.product),
      product_name: item.product_name,
      packet_per_carton: String(item.packet_per_carton),
      product_discount_type: item.product_discount_type,
      product_discount: item.product_discount ?? "",
      quantity: String(item.quantity),
      packet_price: String(Number(item.packet_price)),
      discount: blankIfZero(item.discount),
      manual_lots: true,
      lots_from_saved: true,
      lots: Object.fromEntries(item.lots.map((lot) => [lot.warehouse_item, String(lot.sale_quantity)])),
    })),
    sale_payments: s.sale_payments.map((pay) => ({
      key: `pay-${pay.id}`,
      id: pay.id,
      date: pay.date,
      amount: String(Number(pay.amount)),
      account_information: pay.account_information ?? "",
      note: pay.note ?? "",
    })),
  };
}

function toPayload(f: SaleFormData) {
  const { store_name: _storeName, ...rest } = f;
  return {
    ...rest,
    sale_items: f.sale_items.map((item) => ({
      id: item.id,
      product: item.product,
      quantity: item.quantity,
      packet_price: item.packet_price,
      discount: item.discount,
      lots: item.manual_lots
        ? Object.entries(item.lots)
            .filter(([, qty]) => toInt(qty) > 0)
            .map(([warehouse_item, qty]) => ({ warehouse_item: Number(warehouse_item), quantity: toInt(qty) }))
        : [],
    })),
    sale_payments: f.sale_payments.map(({ key: _k, ...pay }) => pay),
  };
}

type Allocation = {
  rows: { lot: AvailableLot; quantity: number }[];
  allocated: number;
  available: number;
  loading: boolean;
};

function allocate(item: SaleItemFormData, lots: AvailableLot[] | undefined): Allocation {
  if (!item.product) return { rows: [], allocated: 0, available: 0, loading: false };
  if (!lots) return { rows: [], allocated: 0, available: 0, loading: true };
  const rows = item.manual_lots
    ? lots
        .map((lot) => ({ lot, quantity: Math.max(0, toInt(item.lots[lot.warehouse_item])) }))
        .filter((r) => r.quantity > 0)
    : fifoAllocate(lots, toInt(item.quantity));
  return {
    rows,
    allocated: rows.reduce((sum, r) => sum + r.quantity, 0),
    available: lots.reduce((sum, lot) => sum + lot.available, 0),
    loading: false,
  };
}

function itemFigures(item: SaleItemFormData, alloc: Allocation) {
  const price = cartonPrice(toNum(item.packet_price), toNum(item.packet_per_carton) || 1);
  const discount = resolveItemDiscount(toNum(item.discount), price, {
    discountType: item.product_discount_type,
    discount: toNum(item.product_discount) || null,
  });
  const calc = calcSaleItem({
    price,
    quantity: toInt(item.quantity),
    discount,
    lots: alloc.rows.map((r) => ({ quantity: r.quantity, purchasePrice: toNum(r.lot.purchased_price) })),
  });
  return { price, discount, ...calc };
}

type Errors = Record<string, string>;

function validate(f: SaleFormData, allocs: Allocation[]): Errors {
  const errors: Errors = {};
  if (!f.store) errors.store = "Select a store";
  if (!f.date) errors.date = "Date is required";
  const seen = new Set<string>();
  f.sale_items.forEach((item, i) => {
    const qty = toNum(item.quantity);
    if (!item.product) errors[`item.${i}.product`] = "Select a product";
    else if (seen.has(item.product)) errors[`item.${i}.product`] = `Duplicate entry for product ${item.product_name}`;
    else seen.add(item.product);
    if (item.quantity === "") errors[`item.${i}.quantity`] = "Required";
    else if (!Number.isInteger(qty) || qty < 1) errors[`item.${i}.quantity`] = "Whole number, at least 1";
    if (item.packet_price === "") errors[`item.${i}.packet_price`] = "Required";

    const alloc = allocs[i];
    if (!item.product || alloc.loading || errors[`item.${i}.quantity`]) return;
    const over = alloc.rows.find((r) => r.quantity > r.lot.available);
    if (over) {
      errors[`item.${i}.lots`] = `${lotName(over.lot)} has only ${over.lot.available} carton(s) available`;
    } else if (item.manual_lots && alloc.allocated !== qty) {
      errors[`item.${i}.lots`] = `Lots add up to ${alloc.allocated} of ${qty} carton(s)`;
    } else if (!item.manual_lots && alloc.allocated < qty) {
      errors[`item.${i}.lots`] = `Only ${alloc.available} carton(s) in stock`;
    }
  });
  f.sale_payments.forEach((pay, i) => {
    if (!pay.date) errors[`pay.${i}.date`] = "Required";
    if (pay.amount === "") errors[`pay.${i}.amount`] = "Required";
  });
  return errors;
}

// ── Lot picker ───────────────────────────────────────────────────────────────

function LotPanel({
  item, alloc, lots, error, onChoose, onAuto, onLotQty,
}: {
  item: SaleItemFormData;
  alloc: Allocation;
  lots: AvailableLot[];
  error?: string;
  onChoose: () => void;
  onAuto: () => void;
  onLotQty: (warehouseItem: number, value: string) => void;
}) {
  const qty = toInt(item.quantity);

  return (
    <div className="border-t border-slate-100 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wide text-slate-500">Warehouse lots</span>
          <span className={cn("badge", item.manual_lots ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600")}>
            {item.manual_lots ? "Chosen manually" : "Oldest first"}
          </span>
          {!alloc.loading && <span className="text-slate-400">{alloc.available} ctn in stock</span>}
        </div>
        {lots.length > 0 &&
          (item.manual_lots ? (
            <button type="button" onClick={onAuto} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
              Use oldest first
            </button>
          ) : (
            <button type="button" onClick={onChoose} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
              Choose lots
            </button>
          ))}
      </div>

      {alloc.loading ? (
        <p className="mt-2 text-xs text-slate-400">Loading lots...</p>
      ) : lots.length === 0 ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          No stock in the warehouse for this product.
        </p>
      ) : item.manual_lots ? (
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Lot</th>
                <th className="px-3 py-2 text-right font-semibold">Available</th>
                <th className="px-3 py-2 text-right font-semibold">Cost / ctn</th>
                <th className="w-28 px-3 py-2 text-right font-semibold">Take</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lots.map((lot) => {
                const value = item.lots[lot.warehouse_item] ?? "";
                const over = toInt(value) > lot.available;
                return (
                  <tr key={lot.warehouse_item}>
                    <td className="px-3 py-1.5 font-mono text-xs font-semibold text-slate-700">{lotName(lot)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">{lot.available}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">
                      {money(lot.purchased_price, 4)}
                    </td>
                    <td className="px-3 py-1.5">
                      <NumberInput
                        integer
                        value={value}
                        invalid={over}
                        onChange={(v) => onLotQty(lot.warehouse_item, v)}
                        className="h-9 py-1"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50/80 text-xs">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-slate-500">
                  Allocated
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right font-semibold tabular-nums",
                    alloc.allocated === qty ? "text-emerald-600" : "text-amber-600",
                  )}
                >
                  {alloc.allocated} / {qty}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : alloc.rows.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {alloc.rows.map((r) => (
            <span key={r.lot.warehouse_item} className="badge bg-indigo-50 font-mono text-indigo-700">
              {lotName(r.lot)} × {r.quantity}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-400">Enter a quantity to allocate stock.</p>
      )}

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

// ── Form ─────────────────────────────────────────────────────────────────────

export default function SaleForm({ sale }: { sale?: SaleDetail | null }) {
  const router = useRouter();
  const saleId = sale?.id ?? null;
  const [form, setForm] = useState<SaleFormData>(() => toFormData(sale));
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useSaveSale(saleId);
  const remove = useDeleteSale();
  const submitRef = useRef<() => void>(() => {});

  const { data: companies = [] } = useQuery<BillingOption[]>({
    queryKey: ["billing-companies"],
    queryFn: async () => {
      const res = await apiFetch(`${getApiBase()}/billing-companies/`);
      return res.results ?? res;
    },
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    setForm(toFormData(sale));
  }, [sale]);

  useEffect(() => {
    const id = defaultCompanyId(companies);
    if (id) setForm((f) => (f.billing_company ? f : { ...f, billing_company: id }));
  }, [companies]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        submitRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const productIds = [...new Set(form.sale_items.map((i) => i.product).filter(Boolean))];
  const lotQueries = useQueries({ queries: productIds.map((p) => availableLotsQuery(p, saleId)) });
  const lotsByProduct = new Map(productIds.map((p, i) => [p, lotQueries[i]?.data]));

  const allocs = form.sale_items.map((item) => allocate(item, lotsByProduct.get(item.product)));
  const figures = form.sale_items.map((item, i) => itemFigures(item, allocs[i]));
  const totals = calcSale({
    items: figures.map((f, i) => ({
      totalPrice: f.totalPrice,
      profit: f.profit,
      quantity: toInt(form.sale_items[i].quantity),
    })),
    shippingCharge: toNum(form.shipping_charge),
    discountType: form.discount_type,
    discountAmount: toNum(form.discount_amount),
    payments: form.sale_payments.map((p) => toNum(p.amount)),
  });
  const paidPct = totals.total > 0 ? Math.min(100, (totals.payment / totals.total) * 100) : 0;
  const margin = totals.total > 0 ? (totals.profit / totals.total) * 100 : 0;

  const setField = <K extends keyof SaleFormData>(key: K, value: SaleFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setItem = (i: number, patch: Partial<SaleItemFormData> | ((item: SaleItemFormData) => Partial<SaleItemFormData>)) =>
    setForm((f) => ({
      ...f,
      sale_items: f.sale_items.map((item, j) =>
        j === i ? { ...item, ...(typeof patch === "function" ? patch(item) : patch) } : item,
      ),
    }));

  const setPayment = (i: number, patch: Partial<SalePaymentFormData>) =>
    setForm((f) => ({
      ...f,
      sale_payments: f.sale_payments.map((pay, j) => (j === i ? { ...pay, ...patch } : pay)),
    }));

  const submit = async () => {
    if (save.isPending) return;
    const found = validate(form, allocs);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length) {
      setServerError("Please fix the highlighted fields.");
      return;
    }
    try {
      const saved = await save.mutateAsync(toPayload(form));
      setNotice("Sale saved");
      if (!saleId) router.replace(`/sales/${saved.id}`);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Could not save sale");
    }
  };
  submitRef.current = submit;

  const onDelete = async () => {
    if (!saleId) return;
    try {
      await remove.mutateAsync(saleId);
      router.push("/sales");
    } catch (e) {
      setConfirmDelete(false);
      setServerError(e instanceof Error ? e.message : "Could not delete sale");
    }
  };

  const submitLabel = save.isPending ? "Saving..." : saleId ? "Save changes" : "Create sale";

  return (
    <div className="pb-24 xl:pb-0">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/sales" className="text-sm font-medium text-slate-500 hover:text-slate-800">
            ← Sales orders
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {saleId ? `Order ${sale?.order_no}` : "New sales order"}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {saleId
              ? [sale?.store_name, sale?.date].filter(Boolean).join(" · ")
              : "Pick a store, add products, and stock is taken from the oldest lots automatically."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {saleId && (
            <>
              <Link href={`/sales/${saleId}/invoice`} className="btn-secondary">
                Invoice
              </Link>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn-secondary text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </>
          )}
          <button type="button" onClick={submit} disabled={save.isPending} className="btn-primary hidden xl:inline-flex">
            {submitLabel}
          </button>
        </div>
      </div>

      {serverError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}
      {notice && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ✓ {notice}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          {/* 1. Order details */}
          <Section step={1} title="Order details" description="Customer store, dates and delivery status">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Store" required error={errors.store}>
                <AsyncSelect<StoreOption>
                  value={{ id: form.store, name: form.store_name }}
                  loadOptions={loadStores}
                  placeholder="Search store..."
                  invalid={!!errors.store}
                  onSelect={(s) => setForm((f) => ({ ...f, store: String(s.id), store_name: s.name }))}
                />
              </Field>
              <Field label="Billing company">
                <select
                  className="input-modern"
                  value={form.billing_company}
                  onChange={(e) => setField("billing_company", e.target.value)}
                >
                  {!form.billing_company && <option value="">Default company</option>}
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Order date" required error={errors.date}>
                <input
                  type="date"
                  className={cn("input-modern", errors.date && "border-red-300")}
                  value={form.date}
                  onChange={(e) => setField("date", e.target.value)}
                />
              </Field>
              <Field label="Delivery date">
                <input
                  type="date"
                  className="input-modern"
                  value={form.delivery_date}
                  onChange={(e) => setField("delivery_date", e.target.value)}
                />
              </Field>
              <Field label="Status" className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {SALE_STATUSES.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setField("status", key)}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition",
                        form.status === key
                          ? STATUS_STYLES[key]
                          : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50",
                      )}
                    >
                      {form.status === key && "● "}
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </Section>

          {/* 2. Products */}
          <Section
            step={2}
            title="Products"
            description="Carton price = packet price × packets per carton; line total = (carton price − discount) × cartons"
            action={
              <span className="badge bg-slate-100 text-slate-600">
                {form.sale_items.length} item{form.sale_items.length === 1 ? "" : "s"} · {totals.totalCarton} ctn
              </span>
            }
          >
            <div className="space-y-4">
              {form.sale_items.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                  No products yet
                </p>
              )}

              {form.sale_items.map((item, i) => {
                const fig = figures[i];
                const alloc = allocs[i];
                const err = (k: string) => errors[`item.${i}.${k}`];
                const productDiscount = toNum(item.product_discount);
                const discountHint = productDiscount
                  ? `Blank uses product discount (${
                      item.product_discount_type === "percentage" ? `${productDiscount}%` : money(productDiscount)
                    })`
                  : undefined;
                const itemMargin = fig.totalPrice > 0 ? (fig.profit / fig.totalPrice) * 100 : 0;

                return (
                  <div key={item.key} className="rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-start gap-3 p-4 pb-3">
                      <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-500">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <AsyncSelect<ProductOption>
                          value={{ id: item.product, name: item.product_name }}
                          loadOptions={loadProducts}
                          placeholder="Search product..."
                          invalid={!!err("product")}
                          renderMeta={(p) =>
                            `${p.packet_per_carton} pcs/ctn · ${p.stocked_quantity} ctn in stock${
                              Number(p.packet_price) ? ` · ${money(p.packet_price, 4)}/pkt` : ""
                            }`
                          }
                          onSelect={(p) =>
                            setItem(i, (prev) => ({
                              product: String(p.id),
                              product_name: p.name,
                              packet_per_carton: String(p.packet_per_carton || 1),
                              product_discount_type: p.discount_type,
                              product_discount: p.discount ?? "",
                              packet_price: Number(p.packet_price)
                                ? String(roundTo(Number(p.packet_price), 4))
                                : prev.packet_price,
                              manual_lots: false,
                              lots_from_saved: false,
                              lots: {},
                            }))
                          }
                        />
                        {err("product") ? (
                          <p className="mt-1 text-xs text-red-600">{err("product")}</p>
                        ) : (
                          item.product && (
                            <p className="mt-1 text-xs text-slate-400">{item.packet_per_carton} packets per carton</p>
                          )
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, sale_items: f.sale_items.filter((_, j) => j !== i) }))}
                        className="mt-1.5 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove product"
                        title="Remove product"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-3">
                      <Field label="Quantity" required error={err("quantity")}>
                        <NumberInput
                          integer
                          suffix="ctn"
                          value={item.quantity}
                          invalid={!!err("quantity")}
                          onChange={(v) =>
                            setItem(i, (prev) =>
                              prev.lots_from_saved
                                ? { quantity: v, manual_lots: false, lots_from_saved: false, lots: {} }
                                : { quantity: v },
                            )
                          }
                        />
                      </Field>
                      <Field label="Packet price" required error={err("packet_price")}>
                        <NumberInput
                          prefix="$"
                          value={item.packet_price}
                          invalid={!!err("packet_price")}
                          onChange={(v) => setItem(i, { packet_price: v })}
                        />
                      </Field>
                      <Field label="Discount / ctn" hint={discountHint}>
                        <NumberInput prefix="$" value={item.discount} onChange={(v) => setItem(i, { discount: v })} />
                      </Field>
                    </div>

                    {item.product && (
                      <LotPanel
                        item={item}
                        alloc={alloc}
                        lots={lotsByProduct.get(item.product) ?? []}
                        error={err("lots")}
                        onChoose={() =>
                          setItem(i, {
                            manual_lots: true,
                            lots_from_saved: false,
                            lots: Object.fromEntries(alloc.rows.map((r) => [r.lot.warehouse_item, String(r.quantity)])),
                          })
                        }
                        onAuto={() => setItem(i, { manual_lots: false, lots_from_saved: false, lots: {} })}
                        onLotQty={(warehouseItem, value) =>
                          setItem(i, (prev) => ({
                            lots_from_saved: false,
                            lots: { ...prev.lots, [warehouseItem]: value },
                          }))
                        }
                      />
                    )}

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-b-xl border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:grid-cols-5">
                      <Computed label="Carton price" value={money(fig.price, 4)} />
                      <Computed label="Discount / ctn" value={money(fig.discount, 4)} />
                      <Computed label="Line total" value={money(fig.totalPrice)} strong />
                      <Computed label="Purchase cost" value={money(fig.totalPurchasedPrice)} />
                      <Computed
                        label={`Profit${fig.totalPrice > 0 ? ` · ${itemMargin.toFixed(1)}%` : ""}`}
                        value={money(fig.profit)}
                        tone={fig.profit < 0 ? "red" : "green"}
                      />
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, sale_items: [...f.sale_items, emptyItem()] }))}
                className="w-full rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50/50"
              >
                + Add product
              </button>
            </div>
          </Section>

          {/* 3. Charges */}
          <Section step={3} title="Shipping & discount" description="Total = sub total + shipping − discount">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Shipping charge">
                <NumberInput prefix="$" value={form.shipping_charge} onChange={(v) => setField("shipping_charge", v)} />
              </Field>
              <Field label="Discount type">
                <div className="flex h-11 rounded-xl bg-slate-100 p-1">
                  {(
                    [
                      ["percentage", "Percent %"],
                      ["flat", "Flat $"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setField("discount_type", key)}
                      className={cn(
                        "flex-1 rounded-lg text-sm font-medium transition",
                        form.discount_type === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field
                label="Discount"
                hint={
                  form.discount_type === "percentage" && totals.discount
                    ? `${money(totals.discount)} off the sub total`
                    : undefined
                }
              >
                <NumberInput
                  prefix={form.discount_type === "flat" ? "$" : undefined}
                  suffix={form.discount_type === "percentage" ? "%" : undefined}
                  value={form.discount_amount}
                  onChange={(v) => setField("discount_amount", v)}
                />
              </Field>
            </div>
          </Section>

          {/* 4. Payments */}
          <Section
            step={4}
            title="Payments received"
            description="Payment due = total − payments"
            action={
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, sale_payments: [...f.sale_payments, emptyPayment()] }))}
                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
              >
                + Add payment
              </button>
            }
          >
            {form.sale_payments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <p className="text-sm text-slate-400">No payments recorded yet</p>
                {totals.total > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        sale_payments: [{ ...emptyPayment(), amount: String(roundTo(totals.total, 2)) }],
                      }))
                    }
                    className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
                  >
                    Record full payment of {money(totals.total)}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {form.sale_payments.map((pay, i) => {
                  const err = (k: string) => errors[`pay.${i}.${k}`];
                  return (
                    <div
                      key={pay.key}
                      className="grid grid-cols-2 items-start gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[150px_150px_1fr_1fr_auto]"
                    >
                      <Field label="Date" required error={err("date")}>
                        <input
                          type="date"
                          className={cn("input-modern", err("date") && "border-red-300")}
                          value={pay.date}
                          onChange={(e) => setPayment(i, { date: e.target.value })}
                        />
                      </Field>
                      <Field label="Amount" required error={err("amount")}>
                        <NumberInput
                          prefix="$"
                          value={pay.amount}
                          invalid={!!err("amount")}
                          onChange={(v) => setPayment(i, { amount: v })}
                        />
                      </Field>
                      <Field label="Account information">
                        <input
                          className="input-modern"
                          placeholder="Bank / account"
                          value={pay.account_information}
                          onChange={(e) => setPayment(i, { account_information: e.target.value })}
                        />
                      </Field>
                      <Field label="Note">
                        <input
                          className="input-modern"
                          maxLength={100}
                          placeholder="Optional"
                          value={pay.note}
                          onChange={(e) => setPayment(i, { note: e.target.value })}
                        />
                      </Field>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, sale_payments: f.sale_payments.filter((_, j) => j !== i) }))
                        }
                        className="mt-6 h-11 rounded-lg px-3 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove payment"
                        title="Remove payment"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        {/* Summary */}
        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-slate-900">Summary</h2>
            <SummaryRow label="Total cartons" value={totals.totalCarton.toLocaleString()} />
            <SummaryRow label="Sub total" value={money(totals.subTotal)} />
            <SummaryRow label="Discount" value={`− ${money(totals.discount)}`} tone={totals.discount ? "red" : undefined} />
            <SummaryRow label="Shipping" value={`+ ${money(toNum(form.shipping_charge))}`} />
            <div className="my-2 border-t border-slate-100" />
            <SummaryRow label="Total" value={money(totals.total)} strong />

            <div className="my-3 border-t border-slate-100" />
            <SummaryRow label="Paid" value={money(totals.payment)} tone="green" />
            <SummaryRow
              label="Payment due"
              value={money(totals.paymentDue)}
              tone={totals.paymentDue > 0 ? "amber" : "green"}
              strong
            />
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${paidPct}%` }} />
            </div>
            <p className="mt-1 text-right text-xs text-slate-400">{paidPct.toFixed(0)}% paid</p>

            <div className="my-3 border-t border-slate-100" />
            <SummaryRow
              label="Profit"
              value={money(totals.profit)}
              tone={totals.profit < 0 ? "red" : "blue"}
              strong
              hint="Σ (line total − lot purchase cost) − order discount"
            />
            {totals.total > 0 && (
              <p className="text-right text-xs text-slate-400">{margin.toFixed(1)}% margin on total</p>
            )}

            <button type="button" onClick={submit} disabled={save.isPending} className="btn-primary mt-5 hidden w-full xl:inline-flex">
              {submitLabel}
            </button>
            <p className="mt-2 hidden text-center text-xs text-slate-400 xl:block">Tip: press Ctrl + S to save</p>
          </div>
        </aside>
      </div>

      {/* Mobile save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur xl:hidden">
        <div>
          <div className="text-xs text-slate-500">Total · {money(totals.paymentDue)} due</div>
          <div className="font-bold tabular-nums text-slate-900">{money(totals.total)}</div>
        </div>
        <button type="button" onClick={submit} disabled={save.isPending} className="btn-primary">
          {save.isPending ? "Saving..." : saleId ? "Save" : "Create"}
        </button>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete order ${sale?.order_no}?`}
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-3">
            <SecondaryButton onClick={() => setConfirmDelete(false)}>Cancel</SecondaryButton>
            <DangerButton onClick={onDelete} disabled={remove.isPending}>
              {remove.isPending ? "Deleting..." : "Delete sale"}
            </DangerButton>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          The sale is removed and its{" "}
          <span className="font-semibold">{sale?.total_carton ?? 0} carton(s)</span> go back to their warehouse lots.
          Product stock is recalculated.
        </p>
      </Modal>
    </div>
  );
}
