import { prisma } from "../prisma";
import { notDeleted } from "../api-utils";
import { dec, dateStr, isoDate, num, monthDisplay, pct } from "./helpers";
import { SALE_INCLUDE, serializeSale } from "./sale-service";
import { purchaseItemsTotal } from "./purchase-service";

export async function getDashboardData() {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();
  const monthStart = new Date(thisYear, thisMonth - 1, 1);
  const monthEnd = new Date(thisYear, thisMonth, 0, 23, 59, 59);
  const todayStart = new Date(today);

  const [sales, purchases, warehouseCosts, returns, damages, products, monthlyPlan] = await Promise.all([
    prisma.sale.findMany({
      where: { ...notDeleted(), date: { gte: monthStart, lte: monthEnd } },
      include: SALE_INCLUDE,
    }),
    prisma.purchase.findMany({
      where: { ...notDeleted(), date: { gte: monthStart, lte: monthEnd } },
      include: {
        vendor: true,
        purchaseItems: { include: { product: true } },
        purchasePayments: { where: notDeleted() },
      },
    }),
    prisma.warehouseCostItem.findMany({
      where: {
        ...notDeleted(),
        month: { year: thisYear, month: thisMonth, ...notDeleted() },
      },
    }),
    prisma.returnProduct.findMany({
      where: { ...notDeleted(), date: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.damageProduct.findMany({
      where: { ...notDeleted(), date: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.product.findMany({ where: notDeleted() }),
    prisma.monthlyPlan.findFirst({ where: { year: thisYear, month: thisMonth, ...notDeleted() } }),
  ]);

  const allSales = await prisma.sale.findMany({
    where: notDeleted(),
    include: SALE_INCLUDE,
    orderBy: { id: "desc" },
    take: 5,
  });

  const serializedSales = sales.map(serializeSale);
  const todaySales = serializedSales.filter((s) => s.date === today);
  const todayRevenue = todaySales.reduce((a, s) => a + num(s.total), 0);
  const monthlyRevenue = serializedSales.reduce((a, s) => a + num(s.total), 0);
  const monthlyProfit = serializedSales.reduce((a, s) => a + num(s.profit), 0);
  const monthlyPaid = serializedSales.reduce((a, s) => a + num(s.payment), 0);
  const totalSaleDue = serializedSales.reduce((a, s) => a + num(s.payment_due), 0);

  const monthlyPurchaseCost = purchases.reduce((a, p) => {
    const items = purchaseItemsTotal(p.purchaseItems);
    return a + items + num(p.shippingCost) + num(p.warehouseRent) + num(p.employeeSalary);
  }, 0);

  const purchaseDue = purchases.reduce((a, p) => {
    const paid = p.purchasePayments.reduce((s, pay) => s + num(pay.amount), 0);
    const items = purchaseItemsTotal(p.purchaseItems);
    return a + items - paid;
  }, 0);

  const monthlyWhCost = warehouseCosts.reduce((a, c) => a + num(c.amount), 0);
  const monthlyReturns = returns.length;
  const monthlyDamageValue = damages.reduce((a, d) => a + num(d.price), 0);

  const outOfStock = products.filter((p) => (p.stockedQuantity ?? 0) === 0).length;
  const lowStock = products.filter((p) => {
    const q = p.stockedQuantity ?? 0;
    return q > 0 && q <= 10;
  }).length;
  const totalStockValue = products.reduce(
    (a, p) => a + num(p.purchasePrice) * (p.stockedQuantity ?? 0),
    0
  );

  const salesAchieve = monthlyRevenue;
  const spent = monthlyWhCost;
  const salesTarget = num(monthlyPlan?.salesTarget);
  const budget = num(monthlyPlan?.budget);

  const statusBreakdown: Record<string, number> = {};
  for (const s of serializedSales) {
    statusBreakdown[s.status] = (statusBreakdown[s.status] ?? 0) + 1;
  }

  const revenueChart = [];
  for (let m = 1; m <= 12; m++) {
    const mSales = await prisma.sale.findMany({
      where: {
        ...notDeleted(),
        date: { gte: new Date(thisYear, m - 1, 1), lte: new Date(thisYear, m, 0) },
      },
      include: SALE_INCLUDE,
    });
    const rev = mSales.map(serializeSale).reduce((a, s) => a + num(s.total), 0);
    const prof = mSales.map(serializeSale).reduce((a, s) => a + num(s.profit), 0);
    revenueChart.push({ month: m, year: thisYear, revenue: rev, cost: rev - prof, profit: prof });
  }

  const topProductsRaw = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: { sale: notDeleted() },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  const topProducts = await Promise.all(
    topProductsRaw.map(async (tp) => {
      const product = await prisma.product.findUnique({ where: { id: tp.productId } });
      const items = await prisma.saleItem.findMany({ where: { productId: tp.productId, sale: notDeleted() } });
      const revenue = items.reduce((a, i) => a + (num(i.price) - num(i.discount)) * i.quantity, 0);
      return {
        product_name: product?.name ?? "Unknown",
        total_qty: tp._sum.quantity ?? 0,
        total_revenue: revenue,
      };
    })
  );

  return {
    meta: { today, this_month: thisMonth, this_year: thisYear },
    kpis: {
      today_revenue: todayRevenue,
      monthly_revenue: monthlyRevenue,
      monthly_profit: monthlyProfit,
      monthly_paid: monthlyPaid,
      revenue_growth_pct: 0,
      total_sale_due: totalSaleDue,
      monthly_purchase_cost: monthlyPurchaseCost,
      purchase_due: purchaseDue,
      monthly_wh_cost: monthlyWhCost,
      monthly_returns: monthlyReturns,
      monthly_damage_value: monthlyDamageValue,
    },
    inventory: {
      total_products: products.length,
      out_of_stock: outOfStock,
      low_stock: lowStock,
      total_stock_value: totalStockValue,
    },
    monthly_plan: {
      has_plan: !!monthlyPlan,
      sales_target: salesTarget,
      sales_achieve: salesAchieve,
      achievement_pct: pct(salesAchieve, salesTarget),
      budget,
      spent,
      budget_pct: pct(spent, budget),
    },
    revenue_chart: revenueChart,
    top_products: topProducts,
    sale_status_breakdown: statusBreakdown,
    recent_sales: allSales.map((s) => {
      const ser = serializeSale(s);
      return {
        id: ser.id,
        order_no: ser.order_no,
        date: ser.date,
        status: ser.status,
        store_name: ser.store_name,
        total: num(ser.total),
        payment_due: num(ser.payment_due),
      };
    }),
  };
}
