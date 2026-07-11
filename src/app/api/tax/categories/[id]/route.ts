import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent } from "@/lib/route-handler";
import { parseJson } from "@/lib/api-utils";
import { isoDate } from "@/lib/services/helpers";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const body = await parseJson<{ name?: string }>(req);
  const cat = await prisma.taxCategory.update({ where: { id: parseInt(id, 10) }, data: { name: body.name } });
  return ok({ id: cat.id, name: cat.name, created: isoDate(cat.createdAt), updated: isoDate(cat.updatedAt) });
});

export const DELETE = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  await prisma.taxCategory.update({ where: { id: parseInt(id, 10) }, data: { deletedAt: new Date() } });
  return noContent();
});
