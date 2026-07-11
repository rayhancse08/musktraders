import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created } from "@/lib/route-handler";
import { notDeleted, parseJson } from "@/lib/api-utils";
import { serializeYearlyPlan } from "@/lib/services/common-service";

export const GET = withAuth(async () => {
  const plans = await prisma.yearlyPlan.findMany({ where: notDeleted(), orderBy: { year: "desc" } });
  const results = await Promise.all(plans.map(serializeYearlyPlan));
  return ok({ results, count: results.length });
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson<Record<string, string>>(req);
  const plan = await prisma.yearlyPlan.create({
    data: {
      year: parseInt(body.year, 10),
      salesTarget: parseFloat(body.sales_target || "0"),
      budget: parseFloat(body.budget || "0"),
    },
  });
  return created(await serializeYearlyPlan(plan));
});
