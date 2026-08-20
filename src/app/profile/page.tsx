"use client";

import { useAuth } from "@/components/AuthProvider";
import { ChangePasswordForm } from "./_components/change-password";

export default function Page() {
  const { user } = useAuth();
  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="card">
        <div className="card-body flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">
              {user?.username ?? "Account"}
            </h2>
            <p className="truncate text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Change password</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Enter your current password, then choose a new one.
            </p>
          </div>
        </div>
        <div className="card-body">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
