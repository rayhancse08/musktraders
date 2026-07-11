import { NextRequest } from "next/server";
import { withAuth, ok } from "@/lib/route-handler";
import { getSearch } from "@/lib/api-utils";
import { autocompleteProducts } from "@/lib/services/product-service";

export const GET = withAuth(async (req: NextRequest) => {
  const q = getSearch(req) || req.nextUrl.searchParams.get("q") || "";
  return ok(await autocompleteProducts(q));
});
