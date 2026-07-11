import { apiPath } from "./api-config";
import { apiFetch } from "./apiFetch";

export async function loginUser(email: string, password: string) {
  return apiFetch(apiPath("login"), {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
