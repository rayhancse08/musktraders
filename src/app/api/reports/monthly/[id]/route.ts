import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, noContent } from "@/lib/route-handler";
import { notDeleted } from "@/lib/api-utils";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  await prisma.monthlyReport.update({ where: { id: parseInt(id, 10) }, data: { deletedAt: new Date() } });
  return noContent();
});
