import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok } from "@/lib/route-handler";
import { getPage, getSearch } from "@/lib/api-utils";
import { idsSortedByName, inSortedOrder } from "@/lib/name-order";

export const GET = withAuth(async (req: NextRequest) => {
  const page = getPage(req);
  const pageSize = 20;
  const search = getSearch(req) || req.nextUrl.searchParams.get("q")?.trim() || "";
  const ids = await idsSortedByName("vendors", { search, skip: (page - 1) * pageSize, take: pageSize });
  const items = ids.length
    ? await prisma.vendor.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      })
    : [];
  const ordered = inSortedOrder(ids, items);
  return ok({ results: ordered, count: ordered.length });
});
