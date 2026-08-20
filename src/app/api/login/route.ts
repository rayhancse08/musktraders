import { NextRequest } from "next/server";
import { authenticateUser } from "@/lib/auth-server";
import { apiError, parseJson } from "@/lib/api-utils";
import { ok } from "@/lib/route-handler";

export async function POST(req: NextRequest) {
  try {
    const body = await parseJson<{ email?: string; password?: string }>(req);
    if (!body.email || !body.password) {
      return apiError("Email and password are required.");
    }

    const result = await authenticateUser(body.email, body.password);
    if (!result) {
      return apiError("Invalid email or password.", 401);
    }

    return ok(result);
  } catch (err) {
    console.error("Login failed:", err);
    return apiError("Unable to sign in. Check database connection and that tables exist.", 500);
  }
}
