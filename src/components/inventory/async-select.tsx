"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type AsyncOption = { id: number; name: string | null };

type Props<T extends AsyncOption> = {
  value: { id: string; name: string };
  onSelect: (option: T) => void;
  loadOptions: (query: string) => Promise<T[]>;
  renderMeta?: (option: T) => React.ReactNode;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
  inputClassName?: string;
};

export function AsyncSelect<T extends AsyncOption>({
  value,
  onSelect,
  loadOptions,
  renderMeta,
  placeholder = "Search...",
  invalid,
  className,
  inputClassName,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) return;
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await loadOptions(query.trim());
        if (id === requestId.current) {
          setOptions(res);
          setActive(0);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [open, query, loadOptions]);

  const choose = (option: T) => {
    onSelect(option);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (options[active]) choose(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div className={cn("relative", className)}>
      <input
        className={cn(
          "input-modern pr-9",
          invalid && "border-red-300 focus:border-red-500 focus:ring-red-500/10",
          inputClassName,
        )}
        placeholder={value.name || placeholder}
        value={open ? query : value.name}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
        ▾
      </span>

      {open && (
        <div className="absolute z-30 mt-1.5 max-h-72 w-full min-w-[16rem] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {loading && options.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-400">Searching...</div>
          )}
          {!loading && options.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-400">No matches</div>
          )}
          {options.map((option, i) => (
            <button
              key={option.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                choose(option);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm",
                i === active ? "bg-indigo-50 text-indigo-900" : "text-slate-700",
                String(option.id) === value.id && "font-semibold",
              )}
            >
              <span className="truncate">{option.name}</span>
              {renderMeta && <span className="shrink-0 text-xs text-slate-400">{renderMeta(option)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
