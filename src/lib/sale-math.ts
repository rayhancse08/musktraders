/**
 * Sale calculations shared by the API and the sale form, mirroring the Django
 * `Sale.save()` / `SaleItem.save()` logic.
 */
import { roundTo } from "./purchase-math";

export type DiscountType = "percentage" | "flat";

export const SALE_STATUSES = [
  { key: "confirmed", label: "Confirmed" },
  { key: "packing", label: "Packing" },
  { key: "delivering", label: "Delivering" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export type SaleStatus = (typeof SALE_STATUSES)[number]["key"];

/**
 * Per-carton discount: an empty (or zero) discount falls back to the product's
 * own discount, percentage of the carton price or flat.
 */
export function resolveItemDiscount(
  discount: number | null,
  cartonPrice: number,
  product: { discountType: DiscountType | string; discount: number | null },
) {
  if (!discount && product.discount) {
    return roundTo(
      product.discountType === "percentage" ? (product.discount / 100) * cartonPrice : product.discount,
      4,
    );
  }
  return discount ?? 0;
}

export type LotAllocation = { quantity: number; purchasePrice: number };

/** Carton price = packet price × packets per carton. */
export function cartonPrice(packetPrice: number, packetPerCarton: number) {
  return roundTo(packetPrice * (packetPerCarton || 1), 4);
}

export function calcSaleItem(item: {
  price: number;
  quantity: number;
  discount: number;
  lots: LotAllocation[];
}) {
  const price = item.price;
  const totalPrice = roundTo((price - item.discount) * item.quantity, 4);
  const totalPurchasedPrice = roundTo(
    item.lots.reduce((sum, lot) => sum + lot.purchasePrice * lot.quantity, 0),
    4,
  );
  return {
    totalPrice,
    totalPurchasedPrice,
    profit: roundTo(totalPrice - totalPurchasedPrice, 4),
  };
}

export function calcSale(input: {
  items: { totalPrice: number; profit: number; quantity: number }[];
  shippingCharge: number;
  discountType: DiscountType | string;
  discountAmount: number;
  payments: number[];
}) {
  const subTotal = roundTo(input.items.reduce((sum, i) => sum + i.totalPrice, 0), 4);
  const discount = input.discountAmount
    ? roundTo(
        input.discountType === "percentage" ? (input.discountAmount / 100) * subTotal : input.discountAmount,
        4,
      )
    : 0;
  const total = roundTo(subTotal + input.shippingCharge - discount, 4);
  const payment = roundTo(input.payments.reduce((sum, p) => sum + p, 0), 4);
  const itemProfit = input.items.reduce((sum, i) => sum + i.profit, 0);

  return {
    subTotal,
    discount,
    total,
    payment,
    paymentDue: roundTo(total - payment, 4),
    profit: roundTo(itemProfit - discount, 4),
    totalCarton: input.items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

/** Oldest-lot-first allocation; returns what could be covered (may fall short). */
export function fifoAllocate<T extends { available: number }>(lots: T[], quantity: number) {
  const result: { lot: T; quantity: number }[] = [];
  let left = Math.max(0, Math.trunc(quantity));
  for (const lot of lots) {
    if (left <= 0) break;
    const take = Math.min(left, Math.max(0, lot.available));
    if (take > 0) {
      result.push({ lot, quantity: take });
      left -= take;
    }
  }
  return result;
}
