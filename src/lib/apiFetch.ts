import { resolveApiUrl } from "./api-config";

export function parseApiError(text: string, status: number) {
  if (!text) return `Request failed (${status})`;

  try {
    const data = JSON.parse(text);

    if (typeof data === "string") return data;
    if (data.detail) return String(data.detail);
    if (data.message) return String(data.message);
    if (data.non_field_errors?.length) return data.non_field_errors.join(", ");

    const fieldErrors = Object.entries(data)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`);

    if (fieldErrors.length) return fieldErrors.join(" · ");
  } catch {
    // not JSON
  }

  return text.length > 200 ? `Request failed (${status})` : text;
}

export async function apiFetch(url: string, options: RequestInit = {}) {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("access");
  }

  const isFormData = options.body instanceof FormData;
  const resolvedUrl = resolveApiUrl(url);

  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.debug("[apiFetch]", options.method ?? "GET", resolvedUrl);
  }

  const callerHeaders: Record<string, string> = { ...(options.headers as Record<string, string> || {}) };
  if (callerHeaders.Authorization?.includes("null") || callerHeaders.Authorization?.includes("undefined")) {
    delete callerHeaders.Authorization;
  }

  try {
    const res = await fetch(resolvedUrl, {
      ...options,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...callerHeaders,
      },
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(parseApiError(text, res.status));
    }

    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON response");
    }
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error(`Could not reach ${resolvedUrl}. Is the server running?`);
    }
    throw error;
  }
}
