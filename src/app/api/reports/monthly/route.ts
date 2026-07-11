import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created } from "@/lib/route-handler";
import { notDeleted, parseJson } from "@/lib/api-utils";
import { recalculateMonthlyReport, serializeMonthlyReport } from "@/lib/services/common-service";

export const GET = withAuth(async (req: NextRequest) => {
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const reports = await prisma.monthlyReport.findMany({
    where: { year, ...notDeleted() },
    orderBy: { month: "asc" },
  });
  return ok({ results: reports.map(serializeMonthlyReport), count: reports.length });
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson<Record<string, string>>(req);
  const year = parseInt(body.year, 10);
  const month = parseInt(body.month, 10);
  const computed = await recalculateMonthlyReport(year, month);

  const report = await prisma.monthlyReport.upsert({
    where: { year_month: { year, month } },
    create: {
      year, month,
      purchase: computed.purchase,
      warehouseCost: computed.warehouseCost,
      sale: computed.sale,
      damageProduct: computed.damageProduct,
      profit: computed.profit,
      salePaidPayment: computed.salePaidPayment,
      saleDuePayment: computed.saleDuePayment,
      purchasePaidPayment: computed.purchasePaidPayment,
      purchaseDuePayment: computed.purchaseDuePayment,
    },
    update: {
      purchase: computed.purchase,
      warehouseCost: computed.warehouseCost,
      sale: computed.sale,
      damageProduct: computed.damageProduct,
      profit: computed.profit,
      salePaidPayment: computed.salePaidPayment,
      saleDuePayment: computed.saleDuePayment,
      purchasePaidPayment: computed.purchasePaidPayment,
      purchaseDuePayment: computed.purchaseDuePayment,
    },
  });
  return created(serializeMonthlyReport(report));
});
