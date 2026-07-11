import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent } from "@/lib/route-handler";
import { notDeleted, parseFormData, slugify } from "@/lib/api-utils";
import { serializeCategory } from "@/lib/services/product-service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const fd = await parseFormData(req);
  const data: Record<string, unknown> = {};
  if (fd.has("name")) {
    const name = fd.get("name") as string;
    data.name = name;
    data.slug = slugify(name);
  }
  if (fd.has("is_featured")) data.isFeatured = fd.get("is_featured") === "true";

  const category = await prisma.productCategory.update({
    where: { id: parseInt(id, 10) },
    data,
    include: { _count: { select: { products: true } } },
  });
  return ok(serializeCategory(category));
});

export const DELETE = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  await prisma.productCategory.update({
    where: { id: parseInt(id, 10) },
    data: { deletedAt: new Date() },
  });
  return noContent();
});
