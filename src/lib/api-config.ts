/**
 * API configuration — uses same-origin /api routes by default.
 * Set NEXT_PUBLIC_API_URL only if you need an external backend.
 */

export function getBackendRoot() {
  if (typeof window !== "undefined") {
    return (process.env.NEXT_PUBLIC_API_URL || window.location.origin).replace(/\/$/, "");
  }
  return (process.env.NEXT_PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, "");
}

export function getApiBase() {
  const root = getBackendRoot();
  if (!process.env.NEXT_PUBLIC_API_URL && typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }
  return `${root}/api`;
}

/** @deprecated Prefer apiPath() — kept for gradual migration */
export const API_BASE = typeof window !== "undefined"
  ? "" // resolved at runtime via getApiBase()
  : (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : `http://localhost:${process.env.PORT || 3000}/api`);

export function getApiBaseUrl() {
  return getApiBase();
}

export function ensureTrailingSlash(url: string) {
  const [beforeHash, hash] = url.split("#");
  const [pathname, query] = beforeHash.split("?");
  if (!pathname.endsWith("/")) {
    const q = query ? `?${query}` : "";
    const h = hash ? `#${hash}` : "";
    return `${pathname}/${q}${h}`;
  }
  return url;
}

export function apiPath(segment: string) {
  const base = getApiBase().replace(/\/$/, "");
  const path = segment.replace(/^\//, "").replace(/\/$/, "");
  const full = `${base}/${path}`;
  const q = full.includes("?") ? full.slice(full.indexOf("?")) : "";
  const pathname = full.split("?")[0];
  return ensureTrailingSlash(pathname) + q;
}

export function resolveApiUrl(url: string) {
  const str = String(url);

  if (str.startsWith("/api")) {
    const origin = typeof window !== "undefined" ? window.location.origin : getBackendRoot();
    return ensureTrailingSlash(`${origin}${str}`);
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      const backend = getBackendRoot();
      const parsed = new URL(str, backend);
      if (parsed.pathname.startsWith("/api") || str.startsWith(backend)) {
        const apiPathname = parsed.pathname.startsWith("/api") ? parsed.pathname : parsed.pathname;
        return ensureTrailingSlash(`${backend}${apiPathname}`) + parsed.search + parsed.hash;
      }
    } catch {
      // fall through
    }
  }

  return ensureTrailingSlash(str);
}
