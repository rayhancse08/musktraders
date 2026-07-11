import { withAuth, ok } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/api-utils";
import { serializeYearlyPlan } from "@/lib/services/common-service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const plan = await prisma.yearlyPlan.findFirst({ where: { id: parseInt(id, 10), ...notDeleted() } });
  if (!plan) return ok({ detail: "Not found." }, 404);
  return ok(await serializeYearlyPlan(plan));
});
