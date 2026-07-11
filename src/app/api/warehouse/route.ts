import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created } from "@/lib/route-handler";
import { getPage, getSearch, notDeleted, parseJson } from "@/lib/api-utils";
import { listWarehouse, serializeWarehouseItem, createWarehouseItem, updateWarehouseItem } from "@/lib/services/warehouse-service";

export const GET = withAuth(async (req: NextRequest) => {
  const data = await listWarehouse({
    search: getSearch(req),
    lot: req.nextUrl.searchParams.get("lot_number__icontains") ?? "",
    page: getPage(req),
  });
  return ok(data);
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson(req);
  const item = await createWarehouseItem(body as Record<string, unknown>);
  return created(serializeWarehouseItem(item));
});
