"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

import { NAV_DATA } from "./data";
import { ArrowLeftIcon, ChevronUp } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";

export function Sidebar() {
  const pathname = usePathname();
  const { setIsOpen, isOpen, isMobile, toggleSidebar } = useSidebarContext();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? [] : [title]));
  };

  useEffect(() => {
    const activeParent = NAV_DATA.flatMap((section) => section.items).find((item) =>
      item.items?.some((subItem) => subItem.url === pathname)
    );

    if (activeParent) {
      setExpandedItems((prev) =>
        prev.includes(activeParent.title) ? prev : [activeParent.title]
      );
    }
  }, [pathname]);

  return (
    <>
      {isMobile && isOpen && (
        <button
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "flex-shrink-0 overflow-hidden border-r border-slate-800/80 bg-slate-950 shadow-sidebar transition-all duration-300",
          isMobile
            ? "fixed inset-y-0 left-0 z-50 w-[280px]"
            : "sticky top-0 h-screen w-[260px]",
          isOpen ? "translate-x-0" : isMobile ? "-translate-x-full" : "w-0 -translate-x-full border-r-0"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-800/80 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/"
                className="transition-opacity hover:opacity-90"
                onClick={() => isMobile && toggleSidebar()}
              >
                <Logo variant="light" />
              </Link>

              {isMobile && (
                <button
                  onClick={toggleSidebar}
                  className="inline-flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
                >
                  <ArrowLeftIcon className="size-5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
            <div className="space-y-6">
              {NAV_DATA.map((section) => (
                <section key={section.label}>
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    {section.label}
                  </p>

                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const hasChildren = Boolean(item.items?.length);
                      const isExpanded = expandedItems.includes(item.title);
                      const hasActiveChild = Boolean(
                        item.items?.some((subItem) => subItem.url === pathname)
                      );
                      const isActive = pathname === item.url;

                      return (
                        <li key={item.title}>
                          {hasChildren ? (
                            <>
                              <MenuItem
                                isActive={hasActiveChild}
                                onClick={() => toggleExpanded(item.title)}
                                className={cn(
                                  "group rounded-xl px-3 py-2.5 transition-all duration-200",
                                  hasActiveChild
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                                    : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                                )}
                              >
                                <item.icon className="size-[18px] shrink-0" />
                                <span className="text-sm font-medium">{item.title}</span>
                                <ChevronUp
                                  className={cn(
                                    "ml-auto size-4 rotate-180 text-slate-500 transition-transform duration-200",
                                    isExpanded && "rotate-0",
                                    hasActiveChild && "text-indigo-200"
                                  )}
                                />
                              </MenuItem>

                              <div
                                className={cn(
                                  "grid transition-all duration-200 ease-out",
                                  isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                )}
                              >
                                <div className="overflow-hidden">
                                  <ul className="mt-1 space-y-0.5 border-l border-slate-800 pl-3 ml-5">
                                    {item.items?.map((subItem) => (
                                      <li key={subItem.title}>
                                        <MenuItem
                                          as="link"
                                          href={subItem.url}
                                          isActive={pathname === subItem.url}
                                          className={cn(
                                            "rounded-lg px-3 py-2 text-sm transition-all",
                                            pathname === subItem.url
                                              ? "bg-indigo-500/15 font-medium text-indigo-300"
                                              : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-300"
                                          )}
                                        >
                                          {subItem.title}
                                        </MenuItem>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </>
                          ) : (
                            <MenuItem
                              as="link"
                              href={
                                item.url ??
                                "/" + item.title.toLowerCase().replace(/\s+/g, "-")
                              }
                              isActive={isActive}
                              className={cn(
                                "rounded-xl px-3 py-2.5 transition-all duration-200",
                                isActive
                                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                                  : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                              )}
                            >
                              <item.icon className="size-[18px] shrink-0" />
                              <span className="text-sm font-medium">{item.title}</span>
                            </MenuItem>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800/80 p-4">
            <div className="rounded-xl bg-slate-900/80 px-3 py-3">
              <p className="text-xs font-medium text-slate-300">Nextera Inventory</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Order & warehouse management</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
