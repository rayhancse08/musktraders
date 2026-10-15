/**
 * API configuration — same-origin /api by default (Next.js full-stack).
 * Set NEXT_PUBLIC_API_URL only for an external backend.
 */

export function getBackendRoot() {
  if (typeof window !== "undefined") {
    return (process.env.NEXT_PUBLIC_API_URL || window.location.origin).replace(/\/$/, "");
  }
  return (process.env.NEXT_PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, "");
}

export function getApiBase() {
  if (!process.env.NEXT_PUBLIC_API_URL && typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }
  return `${getBackendRoot()}/api`;
}

export function ensureTrailingSlash(url) {
  const [beforeHash, hash] = url.split("#");
  const [pathname, query] = beforeHash.split("?");
  if (!pathname.endsWith("/")) {
    const q = query ? `?${query}` : "";
    const h = hash ? `#${hash}` : "";
    return `${pathname}/${q}${h}`;
  }
  return url;
}

export function apiPath(segment) {
  const base = getApiBase().replace(/\/$/, "");
  const path = segment.replace(/^\//, "").replace(/\/$/, "");
  const full = `${base}/${path}`;
  const q = full.includes("?") ? full.slice(full.indexOf("?")) : "";
  const pathname = full.split("?")[0];
  return ensureTrailingSlash(pathname) + q;
}

export function resolveApiUrl(url) {
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

  if (str.includes("/api/")) {
    return ensureTrailingSlash(str);
  }

  return ensureTrailingSlash(str);
}
