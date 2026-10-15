import { NextRequest, NextResponse } from "next/server";
import { withAuth, ok, noContent } from "@/lib/route-handler";
import { parseJson } from "@/lib/api-utils";
import { getPurchaseDetail, updatePurchase, deletePurchase } from "@/lib/services/purchase-service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const purchase = await getPurchaseDetail(parseInt(id, 10));
  if (!purchase) return NextResponse.json({ detail: "Not found." }, { status: 404 });
  return ok(purchase);
});

export const PATCH = withAuth(async (req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const body = await parseJson(req);
  return ok(await updatePurchase(parseInt(id, 10), body as Record<string, unknown>));
});

export const DELETE = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  await deletePurchase(parseInt(id, 10));
  return noContent();
});
