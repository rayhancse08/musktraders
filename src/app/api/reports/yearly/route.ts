import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created } from "@/lib/route-handler";
import { notDeleted, parseJson } from "@/lib/api-utils";
import { decOrNull, isoDate } from "@/lib/services/helpers";

export const GET = withAuth(async () => {
  const reports = await prisma.yearlyReport.findMany({ where: notDeleted(), orderBy: { year: "desc" } });
  return ok({
    results: reports.map((r) => ({
      id: r.id, year: r.year,
      purchase_amount: decOrNull(r.purchaseAmount),
      warehouse_cost_amount: decOrNull(r.warehouseCostAmount),
      sale_amount: decOrNull(r.saleAmount),
      payment_send_amount: decOrNull(r.paymentSendAmount),
      payment_receive_amount: decOrNull(r.paymentReceiveAmount),
      created: isoDate(r.createdAt), updated: isoDate(r.updatedAt),
    })),
    count: reports.length,
  });
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson<Record<string, string>>(req);
  const year = parseInt(body.year, 10);

  const monthlyReports = await prisma.monthlyReport.findMany({ where: { year, ...notDeleted() } });
  const purchaseAmount = monthlyReports.reduce((a, r) => a + Number(r.purchase ?? 0), 0);
  const warehouseCostAmount = monthlyReports.reduce((a, r) => a + Number(r.warehouseCost ?? 0), 0);
  const saleAmount = monthlyReports.reduce((a, r) => a + Number(r.sale ?? 0), 0);
  const paymentSendAmount = monthlyReports.reduce((a, r) => a + Number(r.purchasePaidPayment ?? 0), 0);
  const paymentReceiveAmount = monthlyReports.reduce((a, r) => a + Number(r.salePaidPayment ?? 0), 0);

  const report = await prisma.yearlyReport.upsert({
    where: { year },
    create: { year, purchaseAmount, warehouseCostAmount, saleAmount, paymentSendAmount, paymentReceiveAmount },
    update: { purchaseAmount, warehouseCostAmount, saleAmount, paymentSendAmount, paymentReceiveAmount },
  });

  return created({
    id: report.id, year: report.year,
    purchase_amount: decOrNull(report.purchaseAmount),
    warehouse_cost_amount: decOrNull(report.warehouseCostAmount),
    sale_amount: decOrNull(report.saleAmount),
    payment_send_amount: decOrNull(report.paymentSendAmount),
    payment_receive_amount: decOrNull(report.paymentReceiveAmount),
    created: isoDate(report.createdAt), updated: isoDate(report.updatedAt),
  });
});
