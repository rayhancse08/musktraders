import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created } from "@/lib/route-handler";
import { notDeleted, parseJson } from "@/lib/api-utils";
import { num } from "@/lib/services/helpers";
import { serializeMonthlyFile } from "@/lib/services/common-service";

export const GET = withAuth(async (req: NextRequest) => {
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const files = await prisma.monthlyCashInFile.findMany({
    where: { year, ...notDeleted() },
    include: { company: true, cashInItems: { where: notDeleted() } },
    orderBy: { month: "asc" },
  });
  const results = files.map((f) => {
    const total = f.cashInItems.reduce((a, i) => a + num(i.amount), 0);
    return serializeMonthlyFile(f, total, f.cashInItems.length, f.company?.name, f.companyId);
  });
  return ok({ results, count: results.length });
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson<Record<string, string>>(req);
  const file = await prisma.monthlyCashInFile.create({
    data: {
      year: parseInt(body.year, 10),
      month: parseInt(body.month, 10),
      companyId: body.company_name ? parseInt(body.company_name, 10) : null,
    },
    include: { company: true, cashInItems: true },
  });
  return created(serializeMonthlyFile(file, 0, 0, file.company?.name, file.companyId));
});
