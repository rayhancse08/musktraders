import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent } from "@/lib/route-handler";
import { parseJson } from "@/lib/api-utils";
import { serializeMonthlyPlan } from "@/lib/services/common-service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const body = await parseJson<Record<string, string>>(req);
  const data: Record<string, unknown> = {};
  if (body.sales_target !== undefined) data.salesTarget = parseFloat(body.sales_target);
  if (body.budget !== undefined) data.budget = parseFloat(body.budget);
  const plan = await prisma.monthlyPlan.update({ where: { id: parseInt(id, 10) }, data });
  return ok(await serializeMonthlyPlan(plan));
});

export const DELETE = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  await prisma.monthlyPlan.update({ where: { id: parseInt(id, 10) }, data: { deletedAt: new Date() } });
  return noContent();
});
