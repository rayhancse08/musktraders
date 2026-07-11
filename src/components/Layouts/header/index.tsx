"use client";

import { SearchIcon } from "@/assets/icons";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { Notification } from "./notification";
import { ThemeToggleSwitch } from "./theme-toggle";
import { UserInfo } from "./user-info";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/products": "Products",
  "/sales": "Sales",
  "/purchases": "Purchases",
  "/warehouse": "Warehouse",
  "/stores": "Stores",
  "/brands": "Brands",
  "/vendors": "Vendors",
  "/tax": "Tax",
  "/cashin": "Cash In",
  "/warehouse-cost": "Warehouse Costs",
  "/plans": "Plans",
  "/report": "Reports",
  "/return-damaged-products": "Returns & Damage",
  "/profile": "Profile",
  "/calendar": "Calendar",
};

function getPageTitle(pathname: string | null) {
  if (!pathname) return "Dashboard";
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const base = "/" + pathname.split("/").filter(Boolean)[0];
  return PAGE_TITLES[base] ?? "Dashboard";
}

export function Header() {
  const { toggleSidebar, isMobile } = useSidebarContext();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-xl md:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 lg:hidden"
          >
            <MenuIcon />
            <span className="sr-only">Toggle Sidebar</span>
          </button>

          {isMobile && (
            <Link href="/" className="flex shrink-0 items-center lg:hidden">
              <Image
                src="/images/logo/logo-icon.svg"
                width={32}
                height={32}
                alt=""
                role="presentation"
              />
            </Link>
          )}

          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 md:text-xl">
              {pageTitle}
            </h1>
            <p className="hidden truncate text-sm text-slate-500 sm:block">
              Nextera Inventory Solution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden w-full max-w-xs md:block lg:max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search..."
              className="input-modern h-10 pl-10"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            <ThemeToggleSwitch />
            <Notification />
          </div>

          <UserInfo />
        </div>
      </div>
    </header>
  );
}
