import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok } from "@/lib/route-handler";
import { notDeleted, parseJson } from "@/lib/api-utils";
import { serializeSaleDetail, getSaleDetail, updateSale } from "@/lib/services/sale-service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const sale = await getSaleDetail(parseInt(id, 10));
  if (!sale) return NextResponse.json({ detail: "Not found." }, { status: 404 });
  return ok(serializeSaleDetail(sale));
});

export const PATCH = withAuth(async (req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const body = await parseJson(req);
  const sale = await updateSale(parseInt(id, 10), body as Record<string, unknown>);
  return ok(serializeSaleDetail(sale));
});
