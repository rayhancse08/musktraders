import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created } from "@/lib/route-handler";
import { getPage, getSearch, notDeleted, parseFormData, parseJson } from "@/lib/api-utils";
import {
  listProducts, serializeProduct, serializeProductDetail,
  createProductFromForm, updateProductFromForm, recalculateProduct, autocompleteProducts,
} from "@/lib/services/product-service";

export const GET = withAuth(async (req: NextRequest) => {
  const page = getPage(req);
  const search = getSearch(req);
  const category = req.nextUrl.searchParams.get("category") ?? "";
  const q = req.nextUrl.searchParams.get("q");

  if (req.nextUrl.pathname.endsWith("/autocomplete/") || q !== null) {
    return ok(await autocompleteProducts(q ?? search));
  }

  const data = await listProducts({ search, category, page });
  return ok(data);
});

export const POST = withAuth(async (req: NextRequest) => {
  const contentType = req.headers.get("content-type") ?? "";
  let product;

  if (contentType.includes("multipart/form-data")) {
    const fd = await parseFormData(req);
    product = await createProductFromForm(fd);
  } else {
    const body = await parseJson(req);
    const fd = new FormData();
    Object.entries(body).forEach(([k, v]) => fd.append(k, String(v)));
    product = await createProductFromForm(fd);
  }

  return created(serializeProductDetail(product));
});
