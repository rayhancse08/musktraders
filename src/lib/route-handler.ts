import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth } from "./api-utils";

type RouteContext = { params: Promise<Record<string, string>> };

type Handler<C extends RouteContext = RouteContext> = (
  req: NextRequest,
  ctx?: C
) => Promise<NextResponse>;

export class ApiError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return ok({ detail: err.message }, err.status);
  }

  console.error(err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2021":
      case "P2022": {
        const missing = (err.meta?.column ?? err.meta?.table ?? "") as string;
        return ok(
          {
            detail: `Database schema is out of date${missing ? ` (missing ${missing})` : ""}. Run "npx prisma db push" on the server and restart the app.`,
          },
          500
        );
      }
      case "P2002":
        return ok({ detail: "A record with this value already exists." }, 400);
      case "P2003":
        return ok({ detail: "A referenced record (product, vendor, ...) does not exist." }, 400);
      case "P2025":
        return ok({ detail: "Record not found." }, 404);
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return ok({ detail: "Invalid data submitted. Check the form fields and try again." }, 400);
  }

  return ok({ detail: err instanceof Error ? err.message : "Internal server error" }, 500);
}

export function withAuth<C extends RouteContext>(handler: Handler<C>): Handler<C> {
  return async (req, ctx): Promise<NextResponse> => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    try {
      return await handler(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
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
