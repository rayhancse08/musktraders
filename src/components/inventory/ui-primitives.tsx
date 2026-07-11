import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Modal } from "./modal";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function TabSwitcher<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { key: T; label: string; count?: number }[];
  active: T;
  onChange: (key: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1",
        className,
      )}
    >
      {tabs.map(({ key, label, count }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-all",
            active === key
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          {label}
          {count !== undefined && (
            <span
              className={cn(
                "ml-2 rounded-full px-1.5 py-0.5 text-xs",
                active === key
                  ? "bg-indigo-50 text-indigo-600"
                  : "bg-slate-200/80 text-slate-500",
              )}
            >
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function InventoryCard({
  children,
  className,
  title,
  badge,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  badge?: ReactNode;
}) {
  return (
    <div className={cn("card overflow-hidden", className)}>
      {(title || badge) && (
        <div className="card-header">
          {title && <span className="font-semibold text-slate-800">{title}</span>}
          {badge}
        </div>
      )}
      {children}
    </div>
  );
}

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
}) {
  const variants = {
    default: "bg-slate-100 text-slate-600",
    primary: "bg-indigo-50 text-indigo-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
  };

  return (
    <span className={cn("badge", variants[variant])}>
      {children}
    </span>
  );
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn("input-modern w-56", props.className)}
    />
  );
}

export function FormSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn("input-modern", props.className)}
    />
  );
}

export function FormLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <label className={cn("mb-1.5 block text-sm font-medium text-slate-700", className)}>
      {children}
    </label>
  );
}

export function FormInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn("input-modern", props.className)}
    />
  );
}

export function FormTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10",
        props.className,
      )}
    />
  );
}

export function PrimaryButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...props} className={cn("btn-primary", className)}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...props} className={cn("btn-secondary", className)}>
      {children}
    </button>
  );
}

export function DangerButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function AlertError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function SectionLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16">
      <div
        className="mb-3 h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600"
        role="status"
        aria-label="Loading"
      />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function TableLoader({ colSpan, message = "Loading..." }: { colSpan: number; message?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-16 text-center">
        <div className="inline-flex flex-col items-center gap-3">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600"
            role="status"
            aria-label="Loading"
          />
          <span className="text-sm text-slate-500">{message}</span>
        </div>
      </td>
    </tr>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-4 py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
        📦
      </div>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function DeleteModal({
  label,
  onConfirm,
  onClose,
  loading,
}: {
  label: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={`Delete ${label}?`}
      maxWidth="sm"
      footer={
        <div className="flex justify-end gap-3">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <DangerButton onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </DangerButton>
        </div>
      }
    >
      <p className="text-sm text-slate-500">
        This soft-deletes the record. Linked transactions and warehouse data remain unaffected.
      </p>
    </Modal>
  );
}
