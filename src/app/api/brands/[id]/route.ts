import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent } from "@/lib/route-handler";
import { parseJson } from "@/lib/api-utils";
import { isoDate } from "@/lib/services/helpers";

type Ctx = { params: Promise<{ id: string }> };

function serializeBrand(b: { id: number; name: string; createdAt: Date; updatedAt: Date }) {
  return { id: b.id, name: b.name, created: isoDate(b.createdAt), updated: isoDate(b.updatedAt) };
}

export const PATCH = withAuth(async (req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const body = await parseJson<{ name?: string }>(req);
  const brand = await prisma.brand.update({ where: { id: parseInt(id, 10) }, data: { name: body.name } });
  return ok(serializeBrand(brand));
});

export const DELETE = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  await prisma.brand.update({ where: { id: parseInt(id, 10) }, data: { deletedAt: new Date() } });
  return noContent();
});
