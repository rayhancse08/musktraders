import { NextRequest } from "next/server";
import { withAuth, ok, created } from "@/lib/route-handler";
import { getPage, getSearch, parseJson } from "@/lib/api-utils";
import { listSales, createSale } from "@/lib/services/sale-service";

export const GET = withAuth(async (req: NextRequest) => {
  const params = req.nextUrl.searchParams;
  const store = parseInt(params.get("store") ?? "", 10);
  const data = await listSales({
    search: getSearch(req),
    status: params.get("status") ?? "",
    store: Number.isNaN(store) ? undefined : store,
    dateRange: params.get("date_range") ?? "",
    page: getPage(req),
  });
  return ok(data);
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson(req);
  return created(await createSale(body as Record<string, unknown>));
});
