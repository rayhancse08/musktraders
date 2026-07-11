import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok } from "@/lib/route-handler";
import { notDeleted } from "@/lib/api-utils";
import { recalculateMonthlyReport, serializeMonthlyReport } from "@/lib/services/common-service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const existing = await prisma.monthlyReport.findFirst({ where: { id: parseInt(id, 10), ...notDeleted() } });
  if (!existing) return NextResponse.json({ detail: "Not found." }, { status: 404 });

  const computed = await recalculateMonthlyReport(existing.year, existing.month);
  const report = await prisma.monthlyReport.update({
    where: { id: existing.id },
    data: {
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
  return ok(serializeMonthlyReport(report));
});
