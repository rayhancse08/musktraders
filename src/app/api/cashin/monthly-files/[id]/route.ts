import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent } from "@/lib/route-handler";
import { notDeleted } from "@/lib/api-utils";
import { decOrNull, dateStr, isoDate, num } from "@/lib/services/helpers";
import { serializeMonthlyFile } from "@/lib/services/common-service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const file = await prisma.monthlyCashInFile.findFirst({
    where: { id: parseInt(id, 10), ...notDeleted() },
    include: { company: true, cashInItems: { where: notDeleted(), include: { cashInCategory: true } } },
  });
  if (!file) return NextResponse.json({ detail: "Not found." }, { status: 404 });
  const total = file.cashInItems.reduce((a, i) => a + num(i.amount), 0);
  return ok({
    ...serializeMonthlyFile(file, total, file.cashInItems.length, file.company?.name, file.companyId),
    warehouse_costs: file.cashInItems.map((i) => ({
      id: i.id, month: file.id, cash_in_category: i.cashInCategoryId,
      cash_in_category_name: i.cashInCategory?.name ?? "",
      date: dateStr(i.date), amount: decOrNull(i.amount), notes: i.notes,
      created: isoDate(i.createdAt), updated: isoDate(i.updatedAt),
    })),
  });
});

export const DELETE = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  await prisma.monthlyCashInFile.update({ where: { id: parseInt(id, 10) }, data: { deletedAt: new Date() } });
  return noContent();
});
