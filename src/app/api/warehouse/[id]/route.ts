import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent } from "@/lib/route-handler";
import { notDeleted, parseJson } from "@/lib/api-utils";
import { serializeWarehouseItem, updateWarehouseItem } from "@/lib/services/warehouse-service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const item = await prisma.warehouseItem.findFirst({
    where: { id: parseInt(id, 10), ...notDeleted() },
    include: { product: true },
  });
  if (!item) return NextResponse.json({ detail: "Not found." }, { status: 404 });
  return ok(serializeWarehouseItem(item));
});

export const PATCH = withAuth(async (req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const body = await parseJson(req);
  const item = await updateWarehouseItem(parseInt(id, 10), body as Record<string, unknown>);
  return ok(serializeWarehouseItem(item));
});

export const DELETE = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  await prisma.warehouseItem.update({
    where: { id: parseInt(id, 10) },
    data: { deletedAt: new Date() },
  });
  return noContent();
});
