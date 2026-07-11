import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created } from "@/lib/route-handler";
import { getPage, getSearch, notDeleted, parseJson } from "@/lib/api-utils";
import { dec, dateStr, isoDate } from "@/lib/services/helpers";

function serializeReturn(r: {
  id: number; date: Date; productId: number; lotNumber: string | null;
  quantity: number; createdAt: Date; updatedAt: Date;
  product?: { name: string | null };
}) {
  return {
    id: r.id,
    date: dateStr(r.date),
    product: r.productId,
    product_name: r.product?.name ?? null,
    lot_number: r.lotNumber,
    quantity: r.quantity,
    created: isoDate(r.createdAt),
    updated: isoDate(r.updatedAt),
  };
}

export const GET = withAuth(async (req: NextRequest) => {
  const page = getPage(req);
  const search = getSearch(req);
  const where: Record<string, unknown> = { ...notDeleted() };
  if (search) where.product = { name: { contains: search, mode: "insensitive" } };

  const [items, count] = await Promise.all([
    prisma.returnProduct.findMany({
      where, include: { product: true },
      orderBy: { id: "desc" }, skip: (page - 1) * 20, take: 20,
    }),
    prisma.returnProduct.count({ where }),
  ]);
  return ok({ results: items.map(serializeReturn), count });
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson<Record<string, string>>(req);
  const item = await prisma.returnProduct.create({
    data: {
      date: new Date(body.date),
      productId: parseInt(body.product, 10),
      lotNumber: body.lot_number || null,
      quantity: parseInt(body.quantity, 10),
    },
    include: { product: true },
  });
  return created(serializeReturn(item));
});
