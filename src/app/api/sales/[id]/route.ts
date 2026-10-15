import { NextRequest, NextResponse } from "next/server";
import { withAuth, ok, noContent } from "@/lib/route-handler";
import { parseJson } from "@/lib/api-utils";
import { deleteSale, getSaleDetail, updateSale } from "@/lib/services/sale-service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const sale = await getSaleDetail(parseInt(id, 10));
  if (!sale) return NextResponse.json({ detail: "Not found." }, { status: 404 });
  return ok(sale);
});

export const PATCH = withAuth(async (req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const body = await parseJson(req);
  return ok(await updateSale(parseInt(id, 10), body as Record<string, unknown>));
});

export const DELETE = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  await deleteSale(parseInt(id, 10));
  return noContent();
});
