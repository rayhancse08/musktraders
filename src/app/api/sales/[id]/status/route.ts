import { NextRequest } from "next/server";
import { withAuth, ok } from "@/lib/route-handler";
import { parseJson } from "@/lib/api-utils";
import { setSaleStatus } from "@/lib/services/sale-service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const body = await parseJson<{ status?: string }>(req);
  return ok(await setSaleStatus(parseInt(id, 10), body.status));
});
