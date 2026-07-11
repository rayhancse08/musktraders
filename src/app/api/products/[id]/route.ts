import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent } from "@/lib/route-handler";
import { notDeleted, parseFormData, parseJson } from "@/lib/api-utils";
import {
  serializeProductDetail, updateProductFromForm, recalculateProduct,
} from "@/lib/services/product-service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const product = await prisma.product.findFirst({
    where: { id: parseInt(id, 10), ...notDeleted() },
    include: { brand: true, category: true },
  });
  if (!product) return NextResponse.json({ detail: "Not found." }, { status: 404 });
  return ok(serializeProductDetail(product));
});

export const PATCH = withAuth(async (req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const contentType = req.headers.get("content-type") ?? "";
  let product;

  if (contentType.includes("multipart/form-data")) {
    product = await updateProductFromForm(parseInt(id, 10), await parseFormData(req));
  } else {
    const body = await parseJson<Record<string, string>>(req);
    const fd = new FormData();
    Object.entries(body).forEach(([k, v]) => fd.append(k, String(v)));
    product = await updateProductFromForm(parseInt(id, 10), fd);
  }

  return ok(serializeProductDetail(product));
});

export const DELETE = withAuth(async (_req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  await prisma.product.update({
    where: { id: parseInt(id, 10) },
    data: { deletedAt: new Date() },
  });
  return noContent();
});
