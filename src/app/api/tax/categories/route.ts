import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created } from "@/lib/route-handler";
import { notDeleted, parseJson } from "@/lib/api-utils";
import { isoDate } from "@/lib/services/helpers";

// Tax categories
export const GET = withAuth(async () => {
  const items = await prisma.taxCategory.findMany({ where: notDeleted(), orderBy: { name: "asc" } });
  return ok(items.map((c) => ({
    id: c.id, name: c.name, created: isoDate(c.createdAt), updated: isoDate(c.updatedAt),
  })));
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson<{ name?: string }>(req);
  const cat = await prisma.taxCategory.create({ data: { name: body.name ?? "" } });
  return created({ id: cat.id, name: cat.name, created: isoDate(cat.createdAt), updated: isoDate(cat.updatedAt) });
});
