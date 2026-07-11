"use client";

import { ChevronUpIcon } from "@/assets/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon, SettingsIcon, UserIcon } from "./icons";
import { useAuth } from "@/components/AuthProvider";

export function UserInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="rounded-xl outline-none">
        <span className="sr-only">My Account</span>

        <figure className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5 transition hover:bg-slate-50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-semibold text-white">
            {initials}
          </div>
          {user ? (
            <figcaption className="hidden items-center gap-1 text-sm font-medium text-slate-700 sm:flex">
              <span className="max-w-[120px] truncate">{user.username}</span>
              <ChevronUpIcon
                className={cn("size-4 text-slate-400 transition-transform", isOpen && "rotate-180")}
              />
            </figcaption>
          ) : (
            <span className="flex items-center gap-2 text-sm font-medium text-indigo-600">
              <UserIcon />
              Login
            </span>
          )}
        </figure>
      </DropdownTrigger>

      <DropdownContent
        className="min-w-[240px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-elevated"
        align="end"
      >
        {user ? (
          <>
            <div className="rounded-lg bg-slate-50 px-3 py-3">
              <div className="font-medium text-slate-900">{user.username}</div>
              <div className="text-sm text-slate-500">{user.email}</div>
            </div>

            <div className="mt-1 space-y-0.5 p-1">
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                <UserIcon />
                Profile
              </Link>

              <Link
                href="/pages/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                <SettingsIcon />
                Settings
              </Link>
            </div>

            <div className="mt-1 border-t border-slate-100 p-1">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
              >
                <LogOutIcon />
                Logout
              </button>
            </div>
          </>
        ) : (
          <div className="p-1">
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              <UserIcon />
              Login
            </Link>
          </div>
        )}
      </DropdownContent>
    </Dropdown>
  );
}
