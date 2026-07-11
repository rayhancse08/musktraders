import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent } from "@/lib/route-handler";
import { parseJson } from "@/lib/api-utils";
import { decOrNull, dateStr, isoDate, num } from "@/lib/services/helpers";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const body = await parseJson<Record<string, string>>(req);
  const data: Record<string, unknown> = {};
  if (body.date) data.date = new Date(body.date);
  if (body.product) data.productId = parseInt(body.product, 10);
  if (body.quantity) data.quantity = parseInt(body.quantity, 10);

  const item = await prisma.damageProduct.update({
    where: { id: parseInt(id, 10) },
    data,
    include: { product: true },
  });
  const price = item.price ?? num(item.product.purchasePrice) * item.quantity;
  return ok({
    id: item.id, date: dateStr(item.date), product: item.productId,
    product_name: item.product.name, quantity: item.quantity,
    price: decOrNull(price), created: isoDate(item.createdAt), updated: isoDate(item.updatedAt),
  });
});

export const DELETE = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  await prisma.damageProduct.update({ where: { id: parseInt(id, 10) }, data: { deletedAt: new Date() } });
  return noContent();
});
