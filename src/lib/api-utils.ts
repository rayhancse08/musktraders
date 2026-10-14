import { NextRequest, NextResponse } from "next/server";
import { Decimal } from "@prisma/client/runtime/library";
import { verifyToken } from "./auth-server";

export const PAGE_SIZE = 20;

export function notDeleted() {
  return { deletedAt: null };
}

export function dec(v: Decimal | number | string | null | undefined): string {
  if (v === null || v === undefined) return "0.0000";
  return new Decimal(v).toFixed(4);
}

export function decOrNull(v: Decimal | number | string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  return new Decimal(v).toFixed(4);
}

export function num(v: Decimal | number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return Number(v);
}

export function dateStr(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().split("T")[0];
}

export function isoDate(d: Date | string | null | undefined): string {
  if (!d) return new Date().toISOString();
  return typeof d === "string" ? d : d.toISOString();
}

export const MONTH_LABELS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthDisplay(month: number): string {
  return MONTH_LABELS[month] ?? String(month);
}

export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    results: items.slice(start, start + pageSize),
    count: total,
  };
}

export function getPage(req: NextRequest): number {
  const p = req.nextUrl.searchParams.get("page");
  return Math.max(1, parseInt(p ?? "1", 10) || 1);
}

export function getSearch(req: NextRequest): string {
  return req.nextUrl.searchParams.get("search")?.trim() ?? "";
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ detail: message }, { status });
}

export function apiFieldError(errors: Record<string, string>, status = 400) {
  return NextResponse.json(errors, { status });
}

export type AuthResult =
  | { ok: true; userId: number }
  | { ok: false; response: NextResponse };

export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return { ok: false, response: apiError("Authentication credentials were not provided.", 401) };
  }
  const token = header.slice(7);
  const payload = await verifyToken(token);
  if (!payload) {
    return { ok: false, response: apiError("Invalid or expired token.", 401) };
  }
  return { ok: true, userId: payload.userId };
}

export async function parseJson<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export async function parseFormData(req: NextRequest): Promise<FormData> {
  return req.formData();
}

export function formVal(fd: FormData, key: string): string {
  const v = fd.get(key);
  return v === null ? "" : String(v);
}

export function formBool(fd: FormData, key: string): boolean {
  const v = formVal(fd, key).toLowerCase();
  return v === "true" || v === "1" || v === "on";
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}