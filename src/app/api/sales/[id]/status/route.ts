import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok } from "@/lib/route-handler";
import { parseJson } from "@/lib/api-utils";
import { serializeSaleDetail, getSaleDetail } from "@/lib/services/sale-service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const body = await parseJson<{ status?: string }>(req);
  await prisma.sale.update({
    where: { id: parseInt(id, 10) },
    data: { status: body.status as "confirmed" },
  });
  const sale = await getSaleDetail(parseInt(id, 10));
  return ok(serializeSaleDetail(sale!));
});
