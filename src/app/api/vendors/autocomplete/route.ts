import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok } from "@/lib/route-handler";
import { getPage, notDeleted } from "@/lib/api-utils";

export const GET = withAuth(async (req: NextRequest) => {
  const page = getPage(req);
  const items = await prisma.vendor.findMany({
    where: notDeleted(),
    orderBy: { name: "asc" },
    skip: (page - 1) * 20,
    take: 20,
    select: { id: true, name: true },
  });
  return ok({ results: items, count: items.length });
});
