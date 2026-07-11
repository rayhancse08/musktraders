import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent } from "@/lib/route-handler";
import { parseJson } from "@/lib/api-utils";
import { decOrNull, dateStr, isoDate } from "@/lib/services/helpers";
import { COST_TYPE_LABELS } from "@/lib/services/common-service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const body = await parseJson<Record<string, string>>(req);
  const data: Record<string, unknown> = {};
  if (body.cost_type) data.costType = body.cost_type;
  if (body.date !== undefined) data.date = body.date ? new Date(body.date) : null;
  if (body.amount !== undefined) data.amount = parseFloat(body.amount);
  if (body.notes !== undefined) data.notes = body.notes || null;

  const item = await prisma.warehouseCostItem.update({ where: { id: parseInt(id, 10) }, data });
  return ok({
    id: item.id, month: item.monthId, cost_type: item.costType,
    cost_type_display: COST_TYPE_LABELS[item.costType] ?? item.costType,
    date: dateStr(item.date), amount: decOrNull(item.amount), notes: item.notes,
    created: isoDate(item.createdAt), updated: isoDate(item.updatedAt),
  });
});

export const DELETE = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  await prisma.warehouseCostItem.update({ where: { id: parseInt(id, 10) }, data: { deletedAt: new Date() } });
  return noContent();
});
