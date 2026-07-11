import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, created } from "@/lib/route-handler";
import { parseJson } from "@/lib/api-utils";
import { decOrNull, dateStr, isoDate } from "@/lib/services/helpers";
import { COST_TYPE_LABELS } from "@/lib/services/common-service";

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson<Record<string, string>>(req);
  const item = await prisma.warehouseCostItem.create({
    data: {
      monthId: parseInt(body.month, 10),
      costType: (body.cost_type as "rent") || "other",
      date: body.date ? new Date(body.date) : null,
      amount: parseFloat(body.amount || "0"),
      notes: body.notes || null,
    },
  });
  return created({
    id: item.id, month: item.monthId, cost_type: item.costType,
    cost_type_display: COST_TYPE_LABELS[item.costType] ?? item.costType,
    date: dateStr(item.date), amount: decOrNull(item.amount), notes: item.notes,
    created: isoDate(item.createdAt), updated: isoDate(item.updatedAt),
  });
});
