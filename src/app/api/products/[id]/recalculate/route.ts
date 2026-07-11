import { withAuth, ok } from "@/lib/route-handler";
import { serializeProductDetail, recalculateProduct } from "@/lib/services/product-service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const product = await recalculateProduct(parseInt(id, 10));
  return ok(serializeProductDetail(product));
});
