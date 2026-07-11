import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created } from "@/lib/route-handler";
import { notDeleted, parseJson } from "@/lib/api-utils";
import { serializeMonthlyPlan } from "@/lib/services/common-service";

export const GET = withAuth(async (req: NextRequest) => {
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const plans = await prisma.monthlyPlan.findMany({
    where: { year, ...notDeleted() },
    orderBy: { month: "asc" },
  });
  const results = await Promise.all(plans.map(serializeMonthlyPlan));
  return ok({ results, count: results.length });
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson<Record<string, string>>(req);
  const plan = await prisma.monthlyPlan.create({
    data: {
      year: parseInt(body.year, 10),
      month: parseInt(body.month, 10),
      salesTarget: parseFloat(body.sales_target || "0"),
      budget: parseFloat(body.budget || "0"),
    },
  });
  return created(await serializeMonthlyPlan(plan));
});
