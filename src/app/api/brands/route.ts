import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created } from "@/lib/route-handler";
import { getPage, getSearch, notDeleted, parseJson } from "@/lib/api-utils";
import { isoDate } from "@/lib/services/helpers";
import { idsSortedByName, inSortedOrder } from "@/lib/name-order";

function serializeBrand(b: { id: number; name: string; createdAt: Date; updatedAt: Date }) {
  return { id: b.id, name: b.name, created: isoDate(b.createdAt), updated: isoDate(b.updatedAt) };
}

export const GET = withAuth(async (req: NextRequest) => {
  const page = getPage(req);
  const search = getSearch(req);
  const pageSize = parseInt(req.nextUrl.searchParams.get("page_size") ?? "20", 10);
  const where: Record<string, unknown> = { ...notDeleted() };
  if (search) where.name = { contains: search, mode: "insensitive" };

  const skip = (page - 1) * pageSize;
  const [ids, count] = await Promise.all([
    idsSortedByName("brands", { search, skip, take: pageSize }),
    prisma.brand.count({ where }),
  ]);
  const items = ids.length
    ? await prisma.brand.findMany({ where: { id: { in: ids } } })
    : [];
  return ok({ results: inSortedOrder(ids, items).map(serializeBrand), count });
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson<{ name?: string }>(req);
  const brand = await prisma.brand.create({ data: { name: body.name ?? "" } });
  return created(serializeBrand(brand));
});
