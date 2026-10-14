"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { apiFetch } from "@/lib/apiFetch";
import { apiPath } from "@/lib/api-config";

type SaleDetail = {
  id: number;
  date: string;
  delivery_date: string;
  billing_company: string;
  store: number;
  store_name: string;
  order_no: string;
  status: string;
  shipping_charge: string;
  sub_total: string;
  discount_type: string;
  discount_amount: string;
  discount: string;
  total: string;
  profit: string;
  payment: string;
  payment_due: string;
  sale_items: SaleItemDetail[];
  sale_payments: SalePaymentDetail[];
};

type SaleItemDetail = {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  price: string;
  packet_price: string;
  discount: string;
  total_price: string;
  total_purchased_price: string;
  profit: string;
  lot_information: string;
};

type SalePaymentDetail = {
  id: number;
  amount: string;
  date: string;
};

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [saving, setSaving] = useState(false);

  const loadSale = async () => {
    if (!id) return;
    try {
      const data = await apiFetch(apiPath(`sales/${id}`));
      setSale(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSale();
  }, [id]);

  const updateStatus = async (status: string) => {
    if (!id) return;
    try {
      await apiFetch(apiPath(`sales/${id}`), {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      loadSale();
    } catch (e) {
      console.error(e);
    }
  };

  const addPayment = async () => {
    if (!id || !paymentAmount) return;
    setSaving(true);
    try {
      await apiFetch(apiPath("payments"), {
        method: "POST",
        body: JSON.stringify({
          sale: id,
          amount: paymentAmount,
          date: paymentDate || new Date().toISOString().slice(0, 10),
        }),
      });
      setPaymentAmount("");
      setPaymentDate("");
      loadSale();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!sale) {
    return (
      <div className="flex justify-center py-20 text-gray-400">Loading...</div>
    );
  }

  return (
    <>
      <Breadcrumb pageName={`Sale #${sale.order_no || sale.id}`} />

      <div className="mb-4 flex justify-end">
        <Link
          href={`/sales/${sale.id}/invoice`}
          className="rounded-lg bg-[#0F3D3A] px-4 py-2 text-sm font-medium text-white"
        >
          View invoice
        </Link>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Order No</p>
            <p className="font-bold text-lg">{sale.order_no || `#${sale.id}`}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Store</p>
            <p className="font-medium">{sale.store_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Date</p>
            <p>{sale.date}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Delivery Date</p>
            <p>{sale.delivery_date ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">Status</p>
            <select
              className="border rounded-lg px-3 py-1 text-sm"
              value={sale.status}
              onChange={(e) => updateStatus(e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sale Items table */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700">Sale Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Pkt Price</th>
              <th className="px-4 py-3 text-right">Discount</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3 text-right">Profit</th>
              <th className="px-4 py-3 text-left">Lots</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
            {sale.sale_items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{item.product_name}</td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-right">{item.price}</td>
                <td className="px-4 py-3 text-right">{item.packet_price}</td>
                <td className="px-4 py-3 text-right text-red-500">
                  {item.discount}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {item.total_price}
                </td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {item.total_purchased_price}
                </td>
                <td className="px-4 py-3 text-right text-green-600">
                  {item.profit}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {item.lot_information || "—"}
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary + Payments side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Totals */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Summary</h3>
          <div className="space-y-2 text-sm">
            {[
              { label: "Sub Total", value: sale.sub_total },
              { label: "Discount", value: sale.discount, color: "text-red-500" },
              { label: "Shipping", value: sale.shipping_charge },
              { label: "Total", value: sale.total, bold: true },
              { label: "Paid", value: sale.payment, color: "text-green-600" },
              {
                label: "Due",
                value: sale.payment_due,
                color: "text-orange-500",
                bold: true,
              },
              { label: "Profit", value: sale.profit, color: "text-blue-600" },
            ].map(({ label, value, color, bold }) => (
              <div key={label} className="flex justify-between border-b pb-2">
                <span className="text-gray-500">{label}</span>
                <span
                  className={`${color ?? ""} ${bold ? "font-bold" : ""}`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Payments */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Payments</h3>

          {sale.sale_payments.length === 0 && (
            <p className="text-sm text-gray-400 mb-4">No payments recorded.</p>
          )}

          <div className="space-y-2 mb-4">
            {sale.sale_payments.map((p) => (
              <div
                key={p.id}
                className="flex justify-between text-sm border-b pb-2"
              >
                <span className="text-gray-500">{p.date}</span>
                <span className="font-medium text-green-600">{p.amount}</span>
              </div>
            ))}
          </div>

          {/* Add payment form */}
          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 mb-2 font-medium">
              Add Payment
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                placeholder="Amount"
                className="border p-2 rounded text-sm flex-1"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <input
                type="date"
                className="border p-2 rounded text-sm"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <button
              onClick={addPayment}
              disabled={saving}
              className="w-full bg-green-600 text-white py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : "Record Payment"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}