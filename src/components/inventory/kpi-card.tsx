import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type KpiCardProps = {
  label: string;
  value: string | number;
  sub?: ReactNode;
  accent?: "primary" | "green" | "blue" | "red" | "amber" | "indigo";
  icon?: ReactNode;
  className?: string;
};

const accentStyles = {
  primary: {
    card: "border-indigo-100",
    value: "text-indigo-700",
    bar: "bg-indigo-500",
    icon: "bg-indigo-50 text-indigo-600",
  },
  green: {
    card: "border-emerald-100",
    value: "text-emerald-700",
    bar: "bg-emerald-500",
    icon: "bg-emerald-50 text-emerald-600",
  },
  blue: {
    card: "border-blue-100",
    value: "text-blue-700",
    bar: "bg-blue-500",
    icon: "bg-blue-50 text-blue-600",
  },
  red: {
    card: "border-red-100",
    value: "text-red-700",
    bar: "bg-red-500",
    icon: "bg-red-50 text-red-600",
  },
  amber: {
    card: "border-amber-100",
    value: "text-amber-700",
    bar: "bg-amber-500",
    icon: "bg-amber-50 text-amber-600",
  },
  indigo: {
    card: "border-violet-100",
    value: "text-violet-700",
    bar: "bg-violet-500",
    icon: "bg-violet-50 text-violet-600",
  },
};

export function KpiCard({ label, value, sub, accent = "primary", icon, className }: KpiCardProps) {
  const styles = accentStyles[accent];

  return (
    <div className={cn("stat-card", styles.card, className)}>
      <div className={cn("absolute left-0 right-0 top-0 h-1", styles.bar)} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className={cn("text-2xl font-bold tabular-nums", styles.value)}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
        </div>
        {icon && (
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", styles.icon)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
