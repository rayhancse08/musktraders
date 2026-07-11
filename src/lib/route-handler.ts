import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "./api-utils";

type RouteContext = { params: Promise<Record<string, string>> };

type Handler<C extends RouteContext = RouteContext> = (
  req: NextRequest,
  ctx?: C
) => Promise<NextResponse>;

export function withAuth<C extends RouteContext>(handler: Handler<C>): Handler<C> {
  return async (req, ctx): Promise<NextResponse> => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    return handler(req, ctx);
  };
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function created(data: unknown) {
  return ok(data, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}
