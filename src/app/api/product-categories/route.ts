import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created } from "@/lib/route-handler";
import { notDeleted, parseFormData, slugify } from "@/lib/api-utils";
import { listCategories, serializeCategory } from "@/lib/services/product-service";

export const GET = withAuth(async () => {
  const items = await listCategories();
  return ok({ results: items, count: items.length });
});

export const POST = withAuth(async (req: NextRequest) => {
  const fd = await parseFormData(req);
  const name = fd.get("name") as string;
  const category = await prisma.productCategory.create({
    data: {
      name,
      slug: slugify(name),
      isFeatured: fd.get("is_featured") === "true",
    },
    include: { _count: { select: { products: true } } },
  });
  return created(serializeCategory(category));
});
