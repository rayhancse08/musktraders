import { NextRequest } from "next/server";
import { withAuth, ok, ApiError } from "@/lib/route-handler";
import { availableLots } from "@/lib/services/sale-service";

export const GET = withAuth(async (req: NextRequest) => {
  const product = parseInt(req.nextUrl.searchParams.get("product") ?? "", 10);
  if (Number.isNaN(product)) throw new ApiError("product is required.");
  const sale = parseInt(req.nextUrl.searchParams.get("sale") ?? "", 10);
  return ok({ results: await availableLots(product, Number.isNaN(sale) ? null : sale) });
});
