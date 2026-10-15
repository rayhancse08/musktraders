import { cn } from "@/lib/utils";
import { SALE_STATUSES, SaleStatus } from "@/lib/sale-math";

export const STATUS_STYLES: Record<SaleStatus, string> = {
  confirmed: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  packing: "bg-amber-50 text-amber-700 ring-amber-200",
  delivering: "bg-sky-50 text-sky-700 ring-sky-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
};

export const statusLabel = (status: string) => SALE_STATUSES.find((s) => s.key === status)?.label ?? status;

export function StatusBadge({ status, className }: { status: SaleStatus; className?: string }) {
  return (
    <span className={cn("badge ring-1 ring-inset", STATUS_STYLES[status] ?? STATUS_STYLES.confirmed, className)}>
      {statusLabel(status)}
    </span>
  );
}
