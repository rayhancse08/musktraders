import { NextRequest } from "next/server";
import { changePassword } from "@/lib/auth-server";
import { apiError, parseJson, requireAuth } from "@/lib/api-utils";
import { ok } from "@/lib/route-handler";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await parseJson<{
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    }>(req);

    const currentPassword = body.currentPassword?.trim() ?? "";
    const newPassword = body.newPassword ?? "";
    const confirmPassword = body.confirmPassword ?? "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      return apiError("Current password, new password, and confirmation are required.");
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return apiError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }

    if (newPassword !== confirmPassword) {
      return apiError("New password and confirmation do not match.");
    }

    if (newPassword === currentPassword) {
      return apiError("New password must be different from the current password.");
    }

    const result = await changePassword(auth.userId, currentPassword, newPassword);
    if (!result.ok) {
      if (result.reason === "invalid_current") {
        return apiError("Current password is incorrect.", 400);
      }
      return apiError("User not found.", 404);
    }

    return ok({ detail: "Password updated successfully." });
  } catch (err) {
    console.error("Password change failed:", err);
    return apiError("Unable to change password. Please try again.", 500);
  }
}
