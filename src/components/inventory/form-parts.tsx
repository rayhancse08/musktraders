"use client";

import { cn } from "@/lib/utils";

/** Building blocks shared by the purchase and sale forms. */

export function Section({
  step, title, description, action, children,
}: {
  step: number;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
            {step}
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">{title}</h2>
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function Field({
  label, required, error, hint, children, className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}

export function NumberInput({
  value, onChange, invalid, placeholder, prefix, suffix, integer, className,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  integer?: boolean;
  className?: string;
}) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
          {prefix}
        </span>
      )}
      <input
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        step={integer ? 1 : "any"}
        value={value}
        placeholder={placeholder ?? "0"}
        onChange={(e) => onChange(e.target.value)}
        onWheel={(e) => e.currentTarget.blur()}
        className={cn(
          "input-modern text-right tabular-nums",
          prefix && "pl-7",
          suffix && "pr-9",
          invalid && "border-red-300 focus:border-red-500 focus:ring-red-500/10",
          className,
        )}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function Computed({
  label, value, strong, tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "green" | "red";
}) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div
        className={cn(
          "truncate tabular-nums",
          strong ? "font-semibold text-slate-900" : "text-slate-700",
          tone === "green" && "text-emerald-600",
          tone === "red" && "text-red-600",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function SummaryRow({
  label, value, tone, strong, hint,
}: {
  label: string;
  value: string;
  tone?: "green" | "amber" | "blue" | "red";
  strong?: boolean;
  hint?: string;
}) {
  const tones = { green: "text-emerald-600", amber: "text-amber-600", blue: "text-indigo-600", red: "text-red-600" };
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5" title={hint}>
      <span className={cn("text-sm", strong ? "font-semibold text-slate-800" : "text-slate-500")}>{label}</span>
      <span
        className={cn(
          "tabular-nums",
          strong ? "text-base font-bold" : "text-sm font-medium",
          tone ? tones[tone] : "text-slate-800",
        )}
      >
        {value}
      </span>
    </div>
  );
}
