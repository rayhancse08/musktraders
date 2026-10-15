import { ApiError } from "../route-handler";

/** Request-body parsing shared by the purchase and sale services; errors surface as 400s. */

export type Body = Record<string, unknown>;

export const str = (v: unknown) => (v == null ? "" : String(v).trim());

export function optionalNumber(v: unknown, label: string) {
  const s = str(v);
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) throw new ApiError(`${label}: enter a valid number.`);
  return n;
}

export function requiredNumber(v: unknown, label: string) {
  const n = optionalNumber(v, label);
  if (n == null) throw new ApiError(`${label}: this field is required.`);
  return n;
}

export function optionalInt(v: unknown, label: string) {
  const n = optionalNumber(v, label);
  if (n != null && !Number.isInteger(n)) throw new ApiError(`${label}: enter a whole number.`);
  return n;
}

export function requiredInt(v: unknown, label: string) {
  const n = optionalInt(v, label);
  if (n == null) throw new ApiError(`${label}: this field is required.`);
  return n;
}

export function optionalDate(v: unknown, label: string) {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new ApiError(`${label}: enter a valid date.`);
  return d;
}

export type DateRange = "today" | "past_7_days" | "this_month" | "this_year";

export function dateRangeFilter(range?: string) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const utc = (yy: number, mm: number, dd: number) => new Date(Date.UTC(yy, mm, dd));
  switch (range as DateRange) {
    case "today":
      return { gte: utc(y, m, d), lt: utc(y, m, d + 1) };
    case "past_7_days":
      return { gte: utc(y, m, d - 7), lt: utc(y, m, d + 1) };
    case "this_month":
      return { gte: utc(y, m, 1), lt: utc(y, m + 1, 1) };
    case "this_year":
      return { gte: utc(y, 0, 1), lt: utc(y + 1, 0, 1) };
    default:
      return undefined;
  }
}
