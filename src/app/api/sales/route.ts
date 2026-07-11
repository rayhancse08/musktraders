import { NextRequest } from "next/server";
import { withAuth, ok, created } from "@/lib/route-handler";
import { getPage, getSearch, parseJson } from "@/lib/api-utils";
import {
  listSales, serializeSale, serializeSaleDetail, createSale, getSaleDetail, updateSale,
} from "@/lib/services/sale-service";

export const GET = withAuth(async (req: NextRequest) => {
  const page = getPage(req);
  const search = getSearch(req);
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const data = await listSales({ search, status, page });
  return ok(data);
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson(req);
  const sale = await createSale(body as Record<string, unknown>);
  return created(serializeSaleDetail(sale));
});
