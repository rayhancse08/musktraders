import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created } from "@/lib/route-handler";
import { getPage, getSearch, notDeleted, parseJson } from "@/lib/api-utils";
import { serializeStore } from "@/lib/services/common-service";

export const GET = withAuth(async (req: NextRequest) => {
  const page = getPage(req);
  const search = getSearch(req);
  const pageSize = 20;
  const where: Record<string, unknown> = { ...notDeleted() };
  if (search) where.name = { contains: search, mode: "insensitive" };

  const [items, count] = await Promise.all([
    prisma.store.findMany({ where, orderBy: { id: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.store.count({ where }),
  ]);
  return ok({ results: items.map(serializeStore), count });
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson<Record<string, string>>(req);
  const store = await prisma.store.create({
    data: {
      name: body.name,
      city: body.city || null,
      phoneNumber: body.phone_number || null,
      email: body.email || null,
      address: body.address || null,
      discountType: (body.discount_type as "percentage") || "percentage",
      discount: parseFloat(body.discount || "0"),
      taxId: body.tax_id || null,
    },
  });
  return created(serializeStore(store));
});
