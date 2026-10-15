"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { apiPath } from "@/lib/api-config";
import { SaleDetail } from "@/types/sale";

const money = (v: string | null | undefined) => {
  const n = parseFloat(v ?? "");
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
};

export default function SaleInvoicePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch(apiPath(`sales/${id}`))
      .then(setSale)
      .catch((err: Error) => setError(err.message ?? "Could not load invoice"));
  }, [id]);

  if (error) {
    return <p className="p-8 text-sm text-red-600">{error}</p>;
  }

  if (!sale) {
    return <p className="p-8 text-sm text-slate-500">Loading invoice...</p>;
  }

  const billTo = [sale.store_address, sale.store_city].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/sales/${sale.id}`} className="text-sm font-medium text-slate-500 hover:text-slate-800">
          ← Back to order
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-[#0F3D3A] px-4 py-2 text-sm font-medium text-white"
        >
          Print invoice
        </button>
      </div>

      <article className="bg-white px-8 py-10 text-slate-900 shadow-sm print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <img
            src="/images/logo/musk-traders-logo.jpg"
            alt="Musk Traders"
            className="h-16 w-auto object-contain object-left"
          />
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C6A15B]">Invoice</p>
            <p className="mt-1 text-2xl font-semibold text-[#0F3D3A]">{sale.order_no || `#${sale.id}`}</p>
            <p className="mt-2 text-sm text-slate-500">Date {sale.date}</p>
            {sale.delivery_date && (
              <p className="text-sm text-slate-500">Delivery {sale.delivery_date}</p>
            )}
          </div>
        </header>

        <section className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">From</p>
            <p className="mt-1 font-semibold text-[#0F3D3A]">
              {sale.billing_company_name || "Musk Traders"}
            </p>
            <p className="text-sm text-slate-500">Wholesale</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bill to</p>
            <p className="mt-1 font-semibold">{sale.store_name}</p>
            {billTo && <p className="text-sm text-slate-600">{billTo}</p>}
            {sale.store_phone && <p className="text-sm text-slate-600">{sale.store_phone}</p>}
            {sale.store_email && <p className="text-sm text-slate-600">{sale.store_email}</p>}
          </div>
        </section>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="py-3 font-semibold">Product</th>
              <th className="py-3 text-right font-semibold">Cartons</th>
              <th className="py-3 text-right font-semibold">Carton price</th>
              <th className="py-3 text-right font-semibold">Discount / ctn</th>
              <th className="py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.sale_items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-3 pr-4 font-medium">{item.product_name}</td>
                <td className="py-3 text-right">{item.quantity}</td>
                <td className="py-3 text-right">{money(item.price)}</td>
                <td className="py-3 text-right">{money(item.discount)}</td>
                <td className="py-3 text-right font-medium">{money(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd>{money(sale.sub_total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Discount</dt>
              <dd>{money(sale.discount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Shipping</dt>
              <dd>{money(sale.shipping_charge)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-[#0F3D3A]">
              <dt>Total</dt>
              <dd>{money(sale.total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Paid</dt>
              <dd>{money(sale.payment)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Balance due</dt>
              <dd>{money(sale.payment_due)}</dd>
            </div>
          </dl>
        </div>

        <p className="mt-12 text-center text-xs tracking-wide text-slate-400">
          Thank you for your business.
        </p>
      </article>
    </div>
  );
}
