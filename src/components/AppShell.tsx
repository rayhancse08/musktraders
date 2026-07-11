"use client";

import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Layouts/sidebar";
import { Header } from "@/components/Layouts/header";
import { useAuth } from "@/components/AuthProvider";
import { useEffect } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const publicRoutes = ["/login"];
  const isPublic = pathname != null && publicRoutes.includes(pathname);

  useEffect(() => {
    if (loading) return;

    if (!user && !isPublic) {
      router.replace("/login");
    }

    if (user && isPublic) {
      router.replace("/");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
          <p className="text-sm font-medium text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && !isPublic) return null;
  if (user && isPublic) return null;

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {user && <Sidebar />}

      <div className="flex min-w-0 flex-1 flex-col">
        {user && <Header />}

        <main className="flex-1 overflow-x-hidden p-4 md:p-6 lg:p-8">
          <div className="page-container">{children}</div>
        </main>
      </div>
    </div>
  );
}
