import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created } from "@/lib/route-handler";
import { getPage, getSearch, notDeleted, parseJson } from "@/lib/api-utils";
import { decOrNull, dateStr, isoDate, num } from "@/lib/services/helpers";
import type { DamageProduct, Product } from "@prisma/client";

function serializeDamage(d: DamageProduct & { product?: Product | null }) {
  const price = d.price ?? num(d.product?.purchasePrice) * d.quantity;
  return {
    id: d.id, date: dateStr(d.date), product: d.productId,
    product_name: d.product?.name ?? null, quantity: d.quantity,
    price: decOrNull(price), created: isoDate(d.createdAt), updated: isoDate(d.updatedAt),
  };
}

export const GET = withAuth(async (req: NextRequest) => {
  const page = getPage(req);
  const search = getSearch(req);
  const where: Record<string, unknown> = { ...notDeleted() };
  if (search) where.product = { name: { contains: search, mode: "insensitive" } };

  const [items, count] = await Promise.all([
    prisma.damageProduct.findMany({
      where, include: { product: true },
      orderBy: { id: "desc" }, skip: (page - 1) * 20, take: 20,
    }),
    prisma.damageProduct.count({ where }),
  ]);
  return ok({ results: items.map(serializeDamage), count });
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson<Record<string, string>>(req);
  const product = await prisma.product.findUnique({ where: { id: parseInt(body.product, 10) } });
  const qty = parseInt(body.quantity, 10);
  const price = num(product?.purchasePrice) * qty;

  const item = await prisma.damageProduct.create({
    data: {
      date: new Date(body.date),
      productId: parseInt(body.product, 10),
      quantity: qty,
      price,
    },
    include: { product: true },
  });
  return created(serializeDamage(item));
});
