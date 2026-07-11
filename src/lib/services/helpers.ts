import { Decimal } from "@prisma/client/runtime/library";
import { dec, decOrNull, dateStr, isoDate, monthDisplay, num } from "../api-utils";

export { dec, decOrNull, dateStr, isoDate, monthDisplay, num };

export function calcDiscount(
  subtotal: Decimal,
  discountType: string,
  discountAmount: Decimal
): Decimal {
  if (discountType === "percentage") {
    return subtotal.mul(discountAmount).div(100);
  }
  return discountAmount;
}

export function pct(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export const COST_TYPE_LABELS: Record<string, string> = {
  rent: "Rent",
  salary: "Salary",
  utility: "Utility",
  maintenance: "Maintenance",
  insurance: "Insurance",
  equipment: "Equipment",
  transport: "Transport",
  other: "Other",
};
