import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent } from "@/lib/route-handler";
import { notDeleted } from "@/lib/api-utils";
import { decOrNull, dateStr, isoDate, num } from "@/lib/services/helpers";
import { COST_TYPE_LABELS, serializeMonthlyFile } from "@/lib/services/common-service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const file = await prisma.monthlyWarehouseCost.findFirst({
    where: { id: parseInt(id, 10), ...notDeleted() },
    include: { items: { where: notDeleted() } },
  });
  if (!file) return NextResponse.json({ detail: "Not found." }, { status: 404 });
  const total = file.items.reduce((a, i) => a + num(i.amount), 0);
  return ok({
    ...serializeMonthlyFile(file, total, file.items.length),
    warehouse_costs: file.items.map((i) => ({
      id: i.id, month: file.id, cost_type: i.costType,
      cost_type_display: COST_TYPE_LABELS[i.costType] ?? i.costType,
      date: dateStr(i.date), amount: decOrNull(i.amount), notes: i.notes,
      created: isoDate(i.createdAt), updated: isoDate(i.updatedAt),
    })),
  });
});

export const DELETE = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  await prisma.monthlyWarehouseCost.update({ where: { id: parseInt(id, 10) }, data: { deletedAt: new Date() } });
  return noContent();
});
