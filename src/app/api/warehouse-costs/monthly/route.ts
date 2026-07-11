import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created } from "@/lib/route-handler";
import { notDeleted, parseJson } from "@/lib/api-utils";
import { num } from "@/lib/services/helpers";
import { serializeMonthlyFile } from "@/lib/services/common-service";

export const GET = withAuth(async (req: NextRequest) => {
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const files = await prisma.monthlyWarehouseCost.findMany({
    where: { year, ...notDeleted() },
    include: { items: { where: notDeleted() } },
    orderBy: { month: "asc" },
  });
  const results = files.map((f) => {
    const total = f.items.reduce((a, i) => a + num(i.amount), 0);
    return serializeMonthlyFile(f, total, f.items.length);
  });
  return ok({ results, count: results.length });
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson<Record<string, string>>(req);
  const file = await prisma.monthlyWarehouseCost.create({
    data: { year: parseInt(body.year, 10), month: parseInt(body.month, 10) },
    include: { items: true },
  });
  return created(serializeMonthlyFile(file, 0, 0));
});
