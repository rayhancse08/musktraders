import { prisma } from "../prisma";
import { notDeleted } from "../api-utils";
import { dec, decOrNull, dateStr, isoDate, num, monthDisplay, pct, COST_TYPE_LABELS } from "./helpers";
import type { Store, Vendor, MonthlyPlan, YearlyPlan, MonthlyReport } from "@prisma/client";

// ── Generic CRUD helpers ─────────────────────────────────────────────────────

export async function listSimple<T extends { id: number; name: string; createdAt: Date; updatedAt: Date }>(
  model: { findMany: (args: unknown) => Promise<T[]>; count: (args: unknown) => Promise<number> },
  params: { search?: string; page?: number }
) {
  const page = params.page ?? 1;
  const pageSize = 20;
  const where: Record<string, unknown> = { ...notDeleted() };
  if (params.search) where.name = { contains: params.search, mode: "insensitive" };

  const [items, count] = await Promise.all([
    model.findMany({ where, orderBy: { id: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    model.count({ where }),
  ]);

  return {
    results: items.map((item) => ({
      id: item.id,
      name: item.name,
      created: isoDate(item.createdAt),
      updated: isoDate(item.updatedAt),
    })),
    count,
  };
}

export function serializeStore(s: Store) {
  return {
    id: s.id,
    name: s.name,
    city: s.city,
    phone_number: s.phoneNumber,
    email: s.email,
    address: s.address,
    discount_type: s.discountType,
    discount: dec(s.discount),
    tax_id: s.taxId,
  };
}

export function serializeVendor(v: Vendor) {
  return {
    id: v.id,
    name: v.name,
    phone_number: v.phoneNumber,
    email: v.email,
    address: v.address,
    created: isoDate(v.createdAt),
    updated: isoDate(v.updatedAt),
  };
}

// ── Monthly file pattern (tax, cashin, warehouse cost) ───────────────────────

export function serializeMonthlyFile(file: {
  id: number; year: number; month: number;
  createdAt: Date; updatedAt: Date;
}, totalAmount: number, itemCount: number, companyName?: string | null, companyId?: number | null) {
  return {
    id: file.id,
    year: file.year,
    month: file.month,
    month_display: monthDisplay(file.month),
    company_name: companyId ?? null,
    company_name_str: companyName ?? null,
    total_amount: dec(totalAmount),
    total_cost: dec(totalAmount),
    item_count: itemCount,
    created: isoDate(file.createdAt),
    updated: isoDate(file.updatedAt),
  };
}

// ── Plans ────────────────────────────────────────────────────────────────────

export async function computeMonthlyPlanAchieve(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const { serializeSale, SALE_INCLUDE } = await import("./sale-service");
  const sales = await prisma.sale.findMany({
    where: { ...notDeleted(), date: { gte: start, lte: end } },
    include: SALE_INCLUDE,
  });

  const salesAchieve = sales.map(serializeSale).reduce((a, s) => a + num(s.total), 0);

  const costs = await prisma.warehouseCostItem.findMany({
    where: { ...notDeleted(), month: { year, month, ...notDeleted() } },
  });
  const spent = costs.reduce((a, c) => a + num(c.amount), 0);

  return { salesAchieve, spent };
}

export async function serializeMonthlyPlan(plan: MonthlyPlan) {
  const { salesAchieve, spent } = await computeMonthlyPlanAchieve(plan.year, plan.month);
  const target = num(plan.salesTarget);
  const budget = num(plan.budget);
  return {
    id: plan.id,
    year: plan.year,
    month: plan.month,
    month_display: monthDisplay(plan.month),
    sales_target: decOrNull(plan.salesTarget),
    sales_achieve: dec(salesAchieve),
    achievement_pct: pct(salesAchieve, target),
    budget: decOrNull(plan.budget),
    spent: dec(spent),
    budget_used_pct: pct(spent, budget),
    created: isoDate(plan.createdAt),
    updated: isoDate(plan.updatedAt),
  };
}

export async function serializeYearlyPlan(plan: YearlyPlan) {
  const start = new Date(plan.year, 0, 1);
  const end = new Date(plan.year, 11, 31, 23, 59, 59);

  const { serializeSale, SALE_INCLUDE } = await import("./sale-service");
  const sales = await prisma.sale.findMany({
    where: { ...notDeleted(), date: { gte: start, lte: end } },
    include: SALE_INCLUDE,
  });
  const salesAchieve = sales.map(serializeSale).reduce((a, s) => a + num(s.total), 0);

  const costs = await prisma.warehouseCostItem.findMany({
    where: { ...notDeleted(), month: { year: plan.year, ...notDeleted() } },
  });
  const spent = costs.reduce((a, c) => a + num(c.amount), 0);

  const target = num(plan.salesTarget);
  const budget = num(plan.budget);

  return {
    id: plan.id,
    year: plan.year,
    sales_target: decOrNull(plan.salesTarget),
    sales_achieve: dec(salesAchieve),
    achievement_pct: pct(salesAchieve, target),
    budget: decOrNull(plan.budget),
    spent: dec(spent),
    budget_used_pct: pct(spent, budget),
    created: isoDate(plan.createdAt),
    updated: isoDate(plan.updatedAt),
  };
}
// ── Reports ──────────────────────────────────────────────────────────────────

export async function recalculateMonthlyReport(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const { serializeSale, SALE_INCLUDE } = await import("./sale-service");
  const [purchases, sales, costs, damages] = await Promise.all([
    prisma.purchase.findMany({
      where: { ...notDeleted(), date: { gte: start, lte: end } },
      include: { purchaseItems: { include: { product: true } }, purchasePayments: { where: notDeleted() } },
    }),
    prisma.sale.findMany({
      where: { ...notDeleted(), date: { gte: start, lte: end } },
      include: SALE_INCLUDE,
    }),
    prisma.warehouseCostItem.findMany({
      where: { ...notDeleted(), month: { year, month, ...notDeleted() } },
    }),
    prisma.damageProduct.findMany({
      where: { ...notDeleted(), date: { gte: start, lte: end } },
    }),
  ]);

  const { purchaseItemsTotal } = await import("./purchase-service");
  const purchaseAmt = purchases.reduce((a, p) => a + purchaseItemsTotal(p.purchaseItems), 0);
  const warehouseCost = costs.reduce((a, c) => a + num(c.amount), 0);
  const saleAmt = sales.map(serializeSale).reduce((a, s) => a + num(s.total), 0);
  const damageAmt = damages.reduce((a, d) => a + num(d.price), 0);
  const profit = sales.map(serializeSale).reduce((a, s) => a + num(s.profit), 0);
  const salePaid = sales.map(serializeSale).reduce((a, s) => a + num(s.payment), 0);
  const saleDue = sales.map(serializeSale).reduce((a, s) => a + num(s.payment_due), 0);
  const purchasePaid = purchases.reduce((a, p) =>
    a + p.purchasePayments.reduce((s, pay) => s + num(pay.amount), 0), 0);
  const purchaseDue = purchaseAmt - purchasePaid;

  return {
    purchase: purchaseAmt,
    warehouseCost,
    sale: saleAmt,
    damageProduct: damageAmt,
    profit,
    salePaidPayment: salePaid,
    saleDuePayment: saleDue,
    purchasePaidPayment: purchasePaid,
    purchaseDuePayment: purchaseDue,
  };
}

export function serializeMonthlyReport(r: MonthlyReport) {
  return {
    id: r.id,
    year: r.year,
    month: r.month,
    month_display: monthDisplay(r.month),
    purchase: decOrNull(r.purchase),
    warehouse_cost: decOrNull(r.warehouseCost),
    sale: decOrNull(r.sale),
    damage_product: decOrNull(r.damageProduct),
    profit: decOrNull(r.profit),
    sale_paid_payment: decOrNull(r.salePaidPayment),
    sale_due_payment: decOrNull(r.saleDuePayment),
    purchase_paid_payment: decOrNull(r.purchasePaidPayment),
    purchase_due_payment: decOrNull(r.purchaseDuePayment),
    created: isoDate(r.createdAt),
    updated: isoDate(r.updatedAt),
  };
}

export { COST_TYPE_LABELS };
