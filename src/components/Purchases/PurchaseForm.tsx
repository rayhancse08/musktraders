"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import { usd as money } from "@/lib/format-number";
import { PROFIT_PERCENTAGE, PURCHASE_COST_FIELDS, calcPurchase, calcPurchaseItem } from "@/lib/purchase-math";
import { useDeletePurchase, useSavePurchase } from "@/hooks/usePurchases";
import { DangerButton, SecondaryButton } from "@/components/inventory/ui-primitives";
import { Modal } from "@/components/inventory/modal";
import {
  ProductOption, PurchaseDetail, PurchaseFormData, PurchaseItemFormData, PurchasePaymentFormData, VendorOption,
} from "@/types/purchase";
import { AsyncSelect } from "./AsyncSelect";

const today = () => new Date().toISOString().slice(0, 10);
const newKey = () => Math.random().toString(36).slice(2, 10);
const toNum = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const blankIfZero = (v: string | null | undefined) => (v == null || Number(v) === 0 ? "" : String(Number(v)));

const loadVendors = async (q: string): Promise<VendorOption[]> => {
  const res = await apiFetch(`${getApiBase()}/vendors/autocomplete/?q=${encodeURIComponent(q)}`);
  return res.results ?? res;
};

const loadProducts = async (q: string): Promise<ProductOption[]> => {
  const res = await apiFetch(`${getApiBase()}/products/autocomplete/?q=${encodeURIComponent(q)}`);
  return res.results ?? res;
};

const emptyItem = (): PurchaseItemFormData => ({
  key: newKey(),
  product: "",
  product_name: "",
  packet_per_carton: "",
  unit_price: "",
  purchased_carton: "",
  received_carton: "",
  damaged_carton: "",
  profit_percentage: "",
  cbm: "",
});

const emptyPayment = (): PurchasePaymentFormData => ({
  key: newKey(),
  date: today(),
  amount: "",
  account_information: "",
  note: "",
});

function toFormData(p?: PurchaseDetail | null): PurchaseFormData {
  if (!p) {
    return {
      date: today(),
      receive_date: "",
      vendor: "",
      vendor_name: "",
      lot_number: "",
      shipping_cost: "",
      food_quality_control_cost: "",
      container_clearing_cost: "",
      lory_shipping_cost: "",
      labourer_handling_cost: "",
      warehouse_rent: "",
      employee_salary: "",
      warehouse_other_cost: "",
      lc_information: "",
      bil_information: "",
      container_information: "",
      purchase_items: [emptyItem()],
      purchase_payments: [],
    };
  }
  return {
    date: p.date ?? "",
    receive_date: p.receive_date ?? "",
    vendor: p.vendor ? String(p.vendor) : "",
    vendor_name: p.vendor_name ?? "",
    lot_number: p.lot_number,
    shipping_cost: blankIfZero(p.shipping_cost),
    food_quality_control_cost: blankIfZero(p.food_quality_control_cost),
    container_clearing_cost: blankIfZero(p.container_clearing_cost),
    lory_shipping_cost: blankIfZero(p.lory_shipping_cost),
    labourer_handling_cost: blankIfZero(p.labourer_handling_cost),
    warehouse_rent: blankIfZero(p.warehouse_rent),
    employee_salary: blankIfZero(p.employee_salary),
    warehouse_other_cost: blankIfZero(p.warehouse_other_cost),
    lc_information: p.lc_information ?? "",
    bil_information: p.bil_information ?? "",
    container_information: p.container_information ?? "",
    purchase_items: p.purchase_items.map((item) => ({
      key: `item-${item.id}`,
      id: item.id,
      product: String(item.product),
      product_name: item.product_name,
      packet_per_carton: String(item.packet_per_carton),
      unit_price: String(Number(item.unit_price)),
      purchased_carton: String(item.purchased_carton),
      received_carton: item.received_carton == null ? "" : String(item.received_carton),
      damaged_carton: item.damaged_carton == null ? "" : String(item.damaged_carton),
      profit_percentage: blankIfZero(item.profit_percentage),
      cbm: item.cbm == null ? "" : String(Number(item.cbm)),
    })),
    purchase_payments: p.purchase_payments.map((pay) => ({
      key: `pay-${pay.id}`,
      id: pay.id,
      date: pay.date,
      amount: String(Number(pay.amount)),
      account_information: pay.account_information ?? "",
      note: pay.note ?? "",
    })),
  };
}

function toPayload(f: PurchaseFormData) {
  const { vendor_name: _vendorName, ...rest } = f;
  return {
    ...rest,
    purchase_items: f.purchase_items.map(({ key: _k, product_name: _n, packet_per_carton: _p, ...item }) => item),
    purchase_payments: f.purchase_payments.map(({ key: _k, ...pay }) => pay),
  };
}

type Errors = Record<string, string>;

function validate(f: PurchaseFormData): Errors {
  const errors: Errors = {};
  if (!f.vendor) errors.vendor = "Select a vendor";
  if (!f.lot_number.trim()) errors.lot_number = "Lot number is required";
  const seen = new Map<string, number>();
  f.purchase_items.forEach((item, i) => {
    if (!item.product) errors[`item.${i}.product`] = "Select a product";
    else if (seen.has(item.product)) errors[`item.${i}.product`] = `Duplicate entry for product ${item.product_name}`;
    else seen.set(item.product, i);
    if (item.unit_price === "") errors[`item.${i}.unit_price`] = "Required";
    if (item.purchased_carton === "") errors[`item.${i}.purchased_carton`] = "Required";
    else if (!Number.isInteger(Number(item.purchased_carton))) errors[`item.${i}.purchased_carton`] = "Whole number";
  });
  f.purchase_payments.forEach((pay, i) => {
    if (!pay.date) errors[`pay.${i}.date`] = "Required";
    if (pay.amount === "") errors[`pay.${i}.amount`] = "Required";
  });
  return errors;
}

// ── Small building blocks ────────────────────────────────────────────────────

function Section({
  step, title, description, action, children,
}: {
  step: number;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
            {step}
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">{title}</h2>
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Field({
  label, required, error, hint, children, className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}

function NumberInput({
  value, onChange, invalid, placeholder, prefix, integer, className,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  placeholder?: string;
  prefix?: string;
  integer?: boolean;
  className?: string;
}) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
          {prefix}
        </span>
      )}
      <input
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        step={integer ? 1 : "any"}
        value={value}
        placeholder={placeholder ?? "0"}
        onChange={(e) => onChange(e.target.value)}
        onWheel={(e) => e.currentTarget.blur()}
        className={cn(
          "input-modern text-right tabular-nums",
          prefix && "pl-7",
          invalid && "border-red-300 focus:border-red-500 focus:ring-red-500/10",
          className,
        )}
      />
    </div>
  );
}

function Computed({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={cn("truncate tabular-nums", strong ? "font-semibold text-slate-900" : "text-slate-700")}>
        {value}
      </div>
    </div>
  );
}

function SummaryRow({
  label, value, tone, strong, hint,
}: {
  label: string;
  value: string;
  tone?: "green" | "amber" | "blue" | "red";
  strong?: boolean;
  hint?: string;
}) {
  const tones = { green: "text-emerald-600", amber: "text-amber-600", blue: "text-indigo-600", red: "text-red-600" };
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5" title={hint}>
      <span className={cn("text-sm", strong ? "font-semibold text-slate-800" : "text-slate-500")}>{label}</span>
      <span
        className={cn(
          "tabular-nums",
          strong ? "text-base font-bold" : "text-sm font-medium",
          tone ? tones[tone] : "text-slate-800",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ── Form ─────────────────────────────────────────────────────────────────────

export default function PurchaseForm({ purchase }: { purchase?: PurchaseDetail | null }) {
  const router = useRouter();
  const purchaseId = purchase?.id ?? null;
  const [form, setForm] = useState<PurchaseFormData>(() => toFormData(purchase));
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useSavePurchase(purchaseId);
  const remove = useDeletePurchase();
  const submitRef = useRef<() => void>(() => {});

  useEffect(() => {
    setForm(toFormData(purchase));
  }, [purchase]);

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

  const setField = <K extends keyof PurchaseFormData>(key: K, value: PurchaseFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setItem = (i: number, patch: Partial<PurchaseItemFormData>) =>
    setForm((f) => ({
      ...f,
      purchase_items: f.purchase_items.map((item, j) => (j === i ? { ...item, ...patch } : item)),
    }));

  const setPayment = (i: number, patch: Partial<PurchasePaymentFormData>) =>
    setForm((f) => ({
      ...f,
      purchase_payments: f.purchase_payments.map((pay, j) => (j === i ? { ...pay, ...patch } : pay)),
    }));

  const totals = useMemo(
    () =>
      calcPurchase({
        items: form.purchase_items.map((item) => ({
          unitPrice: toNum(item.unit_price),
          packetPerCarton: toNum(item.packet_per_carton) || 1,
          purchasedCarton: Math.trunc(toNum(item.purchased_carton)),
          profitPercentage: toNum(item.profit_percentage) || null,
        })),
        costs: PURCHASE_COST_FIELDS.map(({ key }) => toNum(form[key])),
        payments: form.purchase_payments.map((p) => toNum(p.amount)),
        expectedSales: toNum(purchase?.expected_sales ?? "0"),
      }),
    [form, purchase?.expected_sales],
  );

  const paidPct =
    totals.totalProductPrice > 0 ? Math.min(100, (totals.payment / totals.totalProductPrice) * 100) : 0;

  const submit = async () => {
    if (save.isPending) return;
    const found = validate(form);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length) {
      setServerError("Please fix the highlighted fields.");
      return;
    }
    try {
      const saved = await save.mutateAsync(toPayload(form));
      setNotice("Purchase saved");
      if (!purchaseId) router.replace(`/purchases/${saved.id}`);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Could not save purchase");
    }
  };
  submitRef.current = submit;

  const onDelete = async () => {
    if (!purchaseId) return;
    try {
      await remove.mutateAsync(purchaseId);
      router.push("/purchases");
    } catch (e) {
      setConfirmDelete(false);
      setServerError(e instanceof Error ? e.message : "Could not delete purchase");
    }
  };

  return (
    <div className="pb-24 xl:pb-0">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/purchases" className="text-sm font-medium text-slate-500 hover:text-slate-800">
            ← Purchase orders
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {purchaseId ? `Lot ${purchase?.lot_number}` : "New purchase order"}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {purchaseId
              ? [purchase?.vendor_name, purchase?.date].filter(Boolean).join(" · ")
              : "Fill in the order, add products, and the totals calculate as you type."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {purchaseId && (
            <>
              <Link href={`/purchases/${purchaseId}/invoice`} className="btn-secondary">
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
            {save.isPending ? "Saving..." : purchaseId ? "Save changes" : "Create purchase"}
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
          <Section step={1} title="Order details" description="Who you bought from and the lot reference">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vendor" required error={errors.vendor}>
                <AsyncSelect<VendorOption>
                  value={{ id: form.vendor, name: form.vendor_name }}
                  loadOptions={loadVendors}
                  placeholder="Search vendor..."
                  invalid={!!errors.vendor}
                  onSelect={(v) => setForm((f) => ({ ...f, vendor: String(v.id), vendor_name: v.name }))}
                />
              </Field>
              <Field label="Lot number" required error={errors.lot_number} hint="Must be unique; links warehouse stock to this purchase">
                <input
                  className={cn("input-modern", errors.lot_number && "border-red-300")}
                  placeholder="e.g. LOT-2026-001"
                  value={form.lot_number}
                  onChange={(e) => setField("lot_number", e.target.value)}
                />
              </Field>
              <Field label="Purchase date">
                <input
                  type="date"
                  className="input-modern"
                  value={form.date}
                  onChange={(e) => setField("date", e.target.value)}
                />
              </Field>
              <Field label="Receive date">
                <input
                  type="date"
                  className="input-modern"
                  value={form.receive_date}
                  onChange={(e) => setField("receive_date", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          {/* 2. Products */}
          <Section
            step={2}
            title="Products"
            description={`Sale price = carton total price ÷ profit % (default ${PROFIT_PERCENTAGE})`}
            action={
              <span className="badge bg-slate-100 text-slate-600">
                {form.purchase_items.length} item{form.purchase_items.length === 1 ? "" : "s"} · {totals.totalCarton} ctn
              </span>
            }
          >
            <div className="space-y-4">
              {form.purchase_items.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                  No products yet
                </p>
              )}

              {form.purchase_items.map((item, i) => {
                const calc = calcPurchaseItem(
                  {
                    unitPrice: toNum(item.unit_price),
                    packetPerCarton: toNum(item.packet_per_carton) || 1,
                    purchasedCarton: Math.trunc(toNum(item.purchased_carton)),
                    profitPercentage: toNum(item.profit_percentage) || null,
                  },
                  totals.cartonHandlingCost,
                );
                const err = (k: string) => errors[`item.${i}.${k}`];
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
                          renderMeta={(p) => `${p.packet_per_carton} pcs/ctn · stock ${p.stocked_quantity}`}
                          onSelect={(p) =>
                            setItem(i, {
                              product: String(p.id),
                              product_name: p.name,
                              packet_per_carton: String(p.packet_per_carton || 1),
                            })
                          }
                        />
                        {err("product") ? (
                          <p className="mt-1 text-xs text-red-600">{err("product")}</p>
                        ) : (
                          item.product && (
                            <p className="mt-1 text-xs text-slate-400">{item.packet_per_carton} pieces per carton</p>
                          )
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, purchase_items: f.purchase_items.filter((_, j) => j !== i) }))
                        }
                        className="mt-1.5 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove product"
                        title="Remove product"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-3 2xl:grid-cols-6">
                      <Field label="Unit price" required error={err("unit_price")}>
                        <NumberInput
                          prefix="$"
                          value={item.unit_price}
                          invalid={!!err("unit_price")}
                          onChange={(v) => setItem(i, { unit_price: v })}
                        />
                      </Field>
                      <Field label="Purchased ctn" required error={err("purchased_carton")}>
                        <NumberInput
                          integer
                          value={item.purchased_carton}
                          invalid={!!err("purchased_carton")}
                          onChange={(v) => setItem(i, { purchased_carton: v })}
                        />
                      </Field>
                      <Field label="Received ctn" hint="Warehouse stock; blank uses purchased">
                        <NumberInput integer value={item.received_carton} onChange={(v) => setItem(i, { received_carton: v })} />
                      </Field>
                      <Field label="Damaged ctn">
                        <NumberInput integer value={item.damaged_carton} onChange={(v) => setItem(i, { damaged_carton: v })} />
                      </Field>
                      <Field label="Profit % (÷)">
                        <NumberInput
                          value={item.profit_percentage}
                          placeholder={String(PROFIT_PERCENTAGE)}
                          onChange={(v) => setItem(i, { profit_percentage: v })}
                        />
                      </Field>
                      <Field label="CBM / ctn">
                        <NumberInput value={item.cbm} onChange={(v) => setItem(i, { cbm: v })} />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-b-xl border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:grid-cols-3 2xl:grid-cols-5">
                      <Computed label="Carton price" value={money(calc.cartonPrice, 4)} />
                      <Computed label="Carton total price" value={money(calc.cartonTotalPrice, 4)} />
                      <Computed label="Total unit price" value={money(calc.totalUnitPrice, 4)} />
                      <Computed label="Sale price / ctn" value={money(calc.salePrice, 4)} />
                      <Computed label="Total price" value={money(calc.totalPrice)} strong />
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, purchase_items: [...f.purchase_items, emptyItem()] }))}
                className="w-full rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50/50"
              >
                + Add product
              </button>
            </div>
          </Section>

          {/* 3. Additional costs */}
          <Section
            step={3}
            title="Additional costs"
            description="Spread across every carton as the carton handling cost"
          >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {PURCHASE_COST_FIELDS.map(({ key, label }) => (
                <Field key={key} label={label}>
                  <NumberInput prefix="$" value={form[key]} onChange={(v) => setField(key, v)} />
                </Field>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-indigo-50/60 px-4 py-3 text-sm">
              <span className="text-slate-600">
                Carton handling cost = {money(totals.additionalCost)} ÷ {totals.totalCarton} cartons
              </span>
              <span className="font-semibold tabular-nums text-indigo-700">
                {money(totals.cartonHandlingCost, 4)} / ctn
              </span>
            </div>
          </Section>

          {/* 4. Payments */}
          <Section
            step={4}
            title="Payments to vendor"
            description="Payment due = total product price − payments"
            action={
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, purchase_payments: [...f.purchase_payments, emptyPayment()] }))}
                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
              >
                + Add payment
              </button>
            }
          >
            {form.purchase_payments.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No payments recorded yet</p>
            ) : (
              <div className="space-y-3">
                {form.purchase_payments.map((pay, i) => {
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
                          setForm((f) => ({ ...f, purchase_payments: f.purchase_payments.filter((_, j) => j !== i) }))
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

          {/* 5. Documents */}
          <Section step={5} title="Shipping documents" description="Optional reference notes">
            <div className="grid gap-4 md:grid-cols-3">
              {(
                [
                  ["lc_information", "LC information"],
                  ["bil_information", "BIL information"],
                  ["container_information", "Container information"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <textarea
                    rows={3}
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                  />
                </Field>
              ))}
            </div>
          </Section>
        </div>

        {/* Summary */}
        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-slate-900">Summary</h2>
            <SummaryRow label="Total cartons" value={totals.totalCarton.toLocaleString()} />
            <SummaryRow label="Total product price" value={money(totals.totalProductPrice)} />
            <SummaryRow label="Additional costs" value={money(totals.additionalCost)} />
            <div className="my-2 border-t border-slate-100" />
            <SummaryRow label="Total purchase cost" value={money(totals.totalPurchaseCost)} strong />
            <SummaryRow label="Carton handling cost" value={money(totals.cartonHandlingCost, 4)} />

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
            <p className="mt-1 text-right text-xs text-slate-400">{paidPct.toFixed(0)}% of product price paid</p>

            <div className="my-3 border-t border-slate-100" />
            <SummaryRow
              label="Expected sales"
              value={money(totals.expectedSales)}
              tone="blue"
              hint="Sum of warehouse stock for this lot × sale price"
            />
            <SummaryRow
              label="Expected profit"
              value={money(totals.expectedProfit)}
              tone={totals.expectedProfit < 0 ? "red" : "blue"}
            />
            {!purchaseId && (
              <p className="mt-2 text-xs text-slate-400">
                Saving adds each product to the warehouse under this lot number.
              </p>
            )}

            <button type="button" onClick={submit} disabled={save.isPending} className="btn-primary mt-5 hidden w-full xl:inline-flex">
              {save.isPending ? "Saving..." : purchaseId ? "Save changes" : "Create purchase"}
            </button>
            <p className="mt-2 hidden text-center text-xs text-slate-400 xl:block">Tip: press Ctrl + S to save</p>
          </div>
        </aside>
      </div>

      {/* Mobile save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur xl:hidden">
        <div>
          <div className="text-xs text-slate-500">Total purchase cost</div>
          <div className="font-bold tabular-nums text-slate-900">{money(totals.totalPurchaseCost)}</div>
        </div>
        <button type="button" onClick={submit} disabled={save.isPending} className="btn-primary">
          {save.isPending ? "Saving..." : purchaseId ? "Save" : "Create"}
        </button>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete lot ${purchase?.lot_number}?`}
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-3">
            <SecondaryButton onClick={() => setConfirmDelete(false)}>Cancel</SecondaryButton>
            <DangerButton onClick={onDelete} disabled={remove.isPending}>
              {remove.isPending ? "Deleting..." : "Delete purchase"}
            </DangerButton>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          The purchase is removed together with all warehouse stock recorded under lot{" "}
          <span className="font-semibold">{purchase?.lot_number}</span>, and the affected product stock is
          recalculated.
        </p>
      </Modal>
    </div>
  );
}
