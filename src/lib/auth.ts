import { apiPath } from "./api-config";
import { apiFetch } from "./apiFetch";

export async function loginUser(email: string, password: string) {
  return apiFetch(apiPath("login"), {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
) {
  return apiFetch(apiPath("profile/password"), {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
}
