/**
 * Purchase calculations shared by the API and the purchase form, mirroring the
 * Django `Purchase.save()` / `PurchaseItem.save()` logic.
 */

export function roundTo(value: number, places: number) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Equivalent of Django's `config.PROFIT_PERCENTAGE`; sale price = carton total price ÷ this. */
export const PROFIT_PERCENTAGE = (() => {
  const v = parseFloat(process.env.NEXT_PUBLIC_PROFIT_PERCENTAGE ?? "");
  return Number.isFinite(v) && v !== 0 ? v : 0.8;
})();

export const PURCHASE_COST_FIELDS = [
  { key: "shipping_cost", label: "Shipping cost" },
  { key: "food_quality_control_cost", label: "Food quality control" },
  { key: "container_clearing_cost", label: "Container clearing" },
  { key: "lory_shipping_cost", label: "Lorry shipping" },
  { key: "labourer_handling_cost", label: "Labourer handling" },
  { key: "warehouse_rent", label: "Warehouse rent" },
  { key: "employee_salary", label: "Employee salary" },
  { key: "warehouse_other_cost", label: "Warehouse other cost" },
] as const;

export type PurchaseCostKey = (typeof PURCHASE_COST_FIELDS)[number]["key"];

export type PurchaseItemInput = {
  unitPrice: number;
  packetPerCarton: number;
  purchasedCarton: number;
  profitPercentage: number | null;
};

export function calcPurchaseItem(item: PurchaseItemInput, cartonHandlingCost: number) {
  const ppc = item.packetPerCarton || 1;
  const cartonPrice = item.unitPrice * ppc;
  const totalPrice = cartonPrice * item.purchasedCarton;
  const cartonTotalPrice = cartonPrice + cartonHandlingCost;
  // A profit percentage of 0 falls back to the default, as in Django.
  const divisor = item.profitPercentage || PROFIT_PERCENTAGE;

  return {
    cartonPrice: roundTo(cartonPrice, 4),
    totalPrice: roundTo(totalPrice, 4),
    cartonTotalPrice: roundTo(cartonTotalPrice, 4),
    totalUnitPrice: roundTo(cartonTotalPrice / ppc, 4),
    salePrice: roundTo(cartonTotalPrice / divisor, 4),
  };
}

export function calcPurchase(input: {
  items: PurchaseItemInput[];
  costs: number[];
  payments: number[];
  expectedSales: number;
}) {
  const totalProductPrice = roundTo(
    input.items.reduce((sum, item) => sum + calcPurchaseItem(item, 0).totalPrice, 0),
    4,
  );
  const additionalCost = roundTo(input.costs.reduce((sum, c) => sum + c, 0), 4);
  const totalPurchaseCost = roundTo(totalProductPrice + additionalCost, 4);
  const totalCarton = input.items.reduce((sum, item) => sum + item.purchasedCarton, 0);
  const cartonHandlingCost = totalCarton ? roundTo(additionalCost / totalCarton, 4) : 0;
  const payment = roundTo(input.payments.reduce((sum, p) => sum + p, 0), 4);

  return {
    totalProductPrice,
    additionalCost,
    totalPurchaseCost,
    totalCarton,
    cartonHandlingCost,
    payment,
    // Due is measured against the product price only, not the landed cost.
    paymentDue: roundTo(totalProductPrice - payment, 4),
    expectedSales: roundTo(input.expectedSales, 4),
    expectedProfit: roundTo(input.expectedSales - totalPurchaseCost, 4),
  };
}
