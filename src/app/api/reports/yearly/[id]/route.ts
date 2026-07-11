import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent } from "@/lib/route-handler";
import { notDeleted } from "@/lib/api-utils";
import { decOrNull, isoDate } from "@/lib/services/helpers";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const existing = await prisma.yearlyReport.findFirst({ where: { id: parseInt(id, 10), ...notDeleted() } });
  if (!existing) return NextResponse.json({ detail: "Not found." }, { status: 404 });

  const monthlyReports = await prisma.monthlyReport.findMany({ where: { year: existing.year, ...notDeleted() } });
  const report = await prisma.yearlyReport.update({
    where: { id: existing.id },
    data: {
      purchaseAmount: monthlyReports.reduce((a, r) => a + Number(r.purchase ?? 0), 0),
      warehouseCostAmount: monthlyReports.reduce((a, r) => a + Number(r.warehouseCost ?? 0), 0),
      saleAmount: monthlyReports.reduce((a, r) => a + Number(r.sale ?? 0), 0),
      paymentSendAmount: monthlyReports.reduce((a, r) => a + Number(r.purchasePaidPayment ?? 0), 0),
      paymentReceiveAmount: monthlyReports.reduce((a, r) => a + Number(r.salePaidPayment ?? 0), 0),
    },
  });
  return ok({
    id: report.id, year: report.year,
    purchase_amount: decOrNull(report.purchaseAmount),
    warehouse_cost_amount: decOrNull(report.warehouseCostAmount),
    sale_amount: decOrNull(report.saleAmount),
    payment_send_amount: decOrNull(report.paymentSendAmount),
    payment_receive_amount: decOrNull(report.paymentReceiveAmount),
    created: isoDate(report.createdAt), updated: isoDate(report.updatedAt),
  });
});

export const DELETE = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  await prisma.yearlyReport.update({ where: { id: parseInt(id, 10) }, data: { deletedAt: new Date() } });
  return noContent();
});
