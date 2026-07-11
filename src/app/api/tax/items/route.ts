import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, created } from "@/lib/route-handler";
import { parseJson } from "@/lib/api-utils";
import { decOrNull, dateStr, isoDate } from "@/lib/services/helpers";

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson<Record<string, string>>(req);
  const item = await prisma.taxItem.create({
    data: {
      monthFileId: parseInt(body.month, 10),
      taxCategoryId: parseInt(body.tax_category, 10),
      date: body.date ? new Date(body.date) : null,
      amount: parseFloat(body.amount || "0"),
      notes: body.notes || null,
    },
    include: { taxCategory: true },
  });
  return created({
    id: item.id, month: item.monthFileId, tax_category: item.taxCategoryId,
    tax_category_name: item.taxCategory.name, date: dateStr(item.date),
    amount: decOrNull(item.amount), notes: item.notes,
    created: isoDate(item.createdAt), updated: isoDate(item.updatedAt),
  });
});
