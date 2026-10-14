"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { apiPath } from "@/lib/api-config";
import { DEFAULT_COMPANY_NAME } from "@/lib/default-company";
import { PurchaseDetail, PurchaseItem } from "@/types/purchase";

const number = (v: string | number | null | undefined, min: number, max = min) => {
  const n = typeof v === "number" ? v : parseFloat(v ?? "");
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: min, maximumFractionDigits: max });
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function packagingDetail(item: PurchaseItem) {
  const pcs = `${item.packet_per_carton}pcs`;
  if (!item.product_weight) return pcs;
  return `${number(item.product_weight, 0, 2)}${item.product_unit ?? ""} X ${pcs}`;
}

const COSTS: { label: string; key: keyof PurchaseDetail }[] = [
  { label: "Shipping", key: "shipping_cost" },
  { label: "Food quality control", key: "food_quality_control_cost" },
  { label: "Container clearing", key: "container_clearing_cost" },
  { label: "Lorry shipping", key: "lory_shipping_cost" },
  { label: "Labourer handling", key: "labourer_handling_cost" },
  { label: "Warehouse rent", key: "warehouse_rent" },
  { label: "Employee salary", key: "employee_salary" },
  { label: "Other costs", key: "warehouse_other_cost" },
  { label: "Carton handling", key: "carton_handling_cost" },
];

const cell = "border border-black px-2 py-1";

function InfoBox({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <table className="w-full border-2 border-black text-sm">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td className={`${cell} w-1/2 font-semibold`}>{label}</td>
            <td className={`${cell} font-semibold`}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PurchaseInvoicePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch(apiPath(`purchases/${id}`))
      .then(setPurchase)
      .catch((err: Error) => setError(err.message ?? "Could not load invoice"));
  }, [id]);

  if (error) {
    return <p className="p-8 text-sm text-red-600">{error}</p>;
  }

  if (!purchase) {
    return <p className="p-8 text-sm text-slate-500">Loading invoice...</p>;
  }

  const costs = COSTS.filter(({ key }) => parseFloat(String(purchase[key] ?? "0")) !== 0);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/purchases" className="text-sm font-medium text-slate-500 hover:text-slate-800">
          Back to purchases
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-[#0F3D3A] px-4 py-2 text-sm font-medium text-white"
        >
          Print invoice
        </button>
      </div>

      <article className="bg-white px-8 py-8 text-black shadow-sm print:shadow-none">
        <header className="relative mb-2 flex items-end justify-between">
          <img
            src="/images/logo/musk-traders-logo.jpg"
            alt="Musk Traders"
            className="h-16 w-auto object-contain object-left"
          />
          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold">Invoice</h1>
          <span />
        </header>

        <section className="mb-0 grid grid-cols-[1fr_auto_1fr] gap-6">
          <InfoBox
            rows={[
              ["Company", DEFAULT_COMPANY_NAME],
              ["Person:", ""],
              ["Address:", ""],
              ["Mobile", ""],
            ]}
          />
          <span />
          <InfoBox
            rows={[
              ["Company Name:", purchase.vendor_name ?? "—"],
              ["Invoice No :", purchase.lot_number],
              ["Date of Issue:", formatDate(purchase.date)],
              ["Order Delivery :", formatDate(purchase.receive_date)],
              ["Tel:", purchase.vendor_phone ?? ""],
            ]}
          />
        </section>

        <table className="mt-0 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#FBE3D6] align-bottom font-semibold">
              <th className={`${cell} w-10 text-left`}>S.No</th>
              <th className={`${cell} text-left`}>Product</th>
              <th className={`${cell} text-left`}>Packaging Detail</th>
              <th className={`${cell} text-right`}>Price FOB US$</th>
              <th className={`${cell} text-right`}>Carton Price FOB US$</th>
              <th className={`${cell} text-right`}>CBM</th>
              <th className={`${cell} text-right`}>Quantity / Carton</th>
              <th className={`${cell} text-right`}>CBM total</th>
              <th className={`${cell} text-right`}>Total Price US$</th>
            </tr>
          </thead>
          <tbody>
            {purchase.purchase_items.map((item, i) => (
              <tr key={item.id}>
                <td className={`${cell} text-right`}>{i + 1}</td>
                <td className={cell}>{item.product_name}</td>
                <td className={cell}>{packagingDetail(item)}</td>
                <td className={`${cell} text-right`}>
                  {number(parseFloat(item.carton_price) / (item.packet_per_carton || 1), 2)}
                </td>
                <td className={`${cell} text-right`}>{number(item.carton_price, 2)}</td>
                <td className={`${cell} text-right`}>{number(item.cbm, 3, 4)}</td>
                <td className={`${cell} text-right`}>{item.purchased_carton}</td>
                <td className={`${cell} text-right`}>{number(item.cbm_total, 2)}</td>
                <td className={`${cell} text-right`}>$ {number(item.line_total, 2)}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td colSpan={6} />
              <td className="border-2 border-black px-2 py-1 text-right">{purchase.total_carton ?? 0}</td>
              <td className="border-2 border-black px-2 py-1 text-right">{number(purchase.total_cbm, 2)}</td>
              <td className="border-2 border-black px-2 py-1 text-right">
                $ {number(purchase.total_product_price, 2)}
              </td>
            </tr>
          </tbody>
        </table>

        <section className="mt-10 flex justify-between gap-10 text-sm">
          <div className="space-y-1">
            <p>Note :</p>
            {purchase.lc_information && <p>LC: {purchase.lc_information}</p>}
            {purchase.bil_information && <p>BIL: {purchase.bil_information}</p>}
            {purchase.container_information && <p>Container: {purchase.container_information}</p>}
          </div>

          <dl className="w-full max-w-xs space-y-1">
            <div className="flex justify-between">
              <dt>Invoice total</dt>
              <dd>$ {number(purchase.total_product_price, 2)}</dd>
            </div>
            {costs.map(({ label, key }) => (
              <div key={key} className="flex justify-between">
                <dt>{label}</dt>
                <dd>$ {number(String(purchase[key]), 2)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-black pt-1 font-bold">
              <dt>Total purchase cost</dt>
              <dd>$ {number(purchase.total_purchase_cost, 2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Paid</dt>
              <dd>$ {number(purchase.payment, 2)}</dd>
            </div>
            <div className="flex justify-between font-bold">
              <dt>Balance due</dt>
              <dd>$ {number(purchase.payment_due, 2)}</dd>
            </div>
          </dl>
        </section>
      </article>
    </div>
  );
}
