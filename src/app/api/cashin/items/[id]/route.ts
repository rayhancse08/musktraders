import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent } from "@/lib/route-handler";
import { parseJson } from "@/lib/api-utils";
import { decOrNull, dateStr, isoDate } from "@/lib/services/helpers";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const body = await parseJson<Record<string, string>>(req);
  const data: Record<string, unknown> = {};
  if (body.cash_in_category !== undefined) data.cashInCategoryId = body.cash_in_category ? parseInt(body.cash_in_category, 10) : null;
  if (body.date !== undefined) data.date = body.date ? new Date(body.date) : null;
  if (body.amount !== undefined) data.amount = parseFloat(body.amount);
  if (body.notes !== undefined) data.notes = body.notes || null;

  const item = await prisma.cashInItem.update({
    where: { id: parseInt(id, 10) }, data, include: { cashInCategory: true },
  });
  return ok({
    id: item.id, month: item.monthFileId, cash_in_category: item.cashInCategoryId,
    cash_in_category_name: item.cashInCategory?.name ?? "",
    date: dateStr(item.date), amount: decOrNull(item.amount), notes: item.notes,
    created: isoDate(item.createdAt), updated: isoDate(item.updatedAt),
  });
});

export const DELETE = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  await prisma.cashInItem.update({ where: { id: parseInt(id, 10) }, data: { deletedAt: new Date() } });
  return noContent();
});
