import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok } from "@/lib/route-handler";
import { getPage, notDeleted } from "@/lib/api-utils";
import { ensureBillingCompany } from "@/lib/ensure-default-company";

export const GET = withAuth(async (req: NextRequest) => {
  const page = getPage(req);
  const defaultCompany = await ensureBillingCompany();
  const items = await prisma.billingCompany.findMany({
    where: notDeleted(),
    orderBy: { name: "asc" },
    skip: (page - 1) * 20,
    take: 20,
    select: { id: true, name: true },
  });
  const results = items.some((item) => item.id === defaultCompany.id)
    ? items
    : [{ id: defaultCompany.id, name: defaultCompany.name }, ...items];
  return ok({ results, count: results.length });
});
