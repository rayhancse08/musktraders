import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent } from "@/lib/route-handler";
import { notDeleted, parseJson } from "@/lib/api-utils";
import { serializeStore } from "@/lib/services/common-service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const body = await parseJson<Record<string, string>>(req);
  const data: Record<string, unknown> = {};
  if (body.name) data.name = body.name;
  if (body.city !== undefined) data.city = body.city || null;
  if (body.phone_number !== undefined) data.phoneNumber = body.phone_number || null;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.address !== undefined) data.address = body.address || null;
  if (body.discount_type) data.discountType = body.discount_type;
  if (body.discount !== undefined) data.discount = parseFloat(body.discount);
  if (body.tax_id !== undefined) data.taxId = body.tax_id || null;

  const store = await prisma.store.update({ where: { id: parseInt(id, 10) }, data });
  return ok(serializeStore(store));
});

export const DELETE = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  await prisma.store.update({ where: { id: parseInt(id, 10) }, data: { deletedAt: new Date() } });
  return noContent();
});
