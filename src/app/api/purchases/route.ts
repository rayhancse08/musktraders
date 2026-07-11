import { NextRequest } from "next/server";
import { withAuth, ok, created } from "@/lib/route-handler";
import { getPage, getSearch, parseJson } from "@/lib/api-utils";
import {
  listPurchases, serializePurchaseDetail, createPurchase, getPurchaseDetail, updatePurchase,
} from "@/lib/services/purchase-service";

export const GET = withAuth(async (req: NextRequest) => {
  const data = await listPurchases({ search: getSearch(req), page: getPage(req) });
  return ok(data);
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson(req);
  const purchase = await createPurchase(body as Record<string, unknown>);
  return created(serializePurchaseDetail(purchase));
});
