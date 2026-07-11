import { NextRequest, NextResponse } from "next/server";
import { withAuth, ok } from "@/lib/route-handler";
import { parseJson } from "@/lib/api-utils";
import { serializePurchaseDetail, getPurchaseDetail, updatePurchase } from "@/lib/services/purchase-service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const purchase = await getPurchaseDetail(parseInt(id, 10));
  if (!purchase) return NextResponse.json({ detail: "Not found." }, { status: 404 });
  return ok(serializePurchaseDetail(purchase));
});

export const PATCH = withAuth(async (req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const body = await parseJson(req);
  const purchase = await updatePurchase(parseInt(id, 10), body as Record<string, unknown>);
  return ok(serializePurchaseDetail(purchase));
});
