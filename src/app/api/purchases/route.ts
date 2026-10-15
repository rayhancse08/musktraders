import { NextRequest } from "next/server";
import { withAuth, ok, created } from "@/lib/route-handler";
import { getPage, getSearch, parseJson } from "@/lib/api-utils";
import { listPurchases, createPurchase } from "@/lib/services/purchase-service";

export const GET = withAuth(async (req: NextRequest) => {
  const vendor = parseInt(req.nextUrl.searchParams.get("vendor") ?? "", 10);
  const data = await listPurchases({
    search: getSearch(req),
    page: getPage(req),
    vendor: Number.isFinite(vendor) ? vendor : undefined,
    dateRange: req.nextUrl.searchParams.get("date_range") ?? undefined,
  });
  return ok(data);
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson(req);
  return created(await createPurchase(body as Record<string, unknown>));
});
