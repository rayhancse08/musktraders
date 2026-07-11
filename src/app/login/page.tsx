"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { loginUser } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";
import { Lock, Mail, ArrowRight, Loader2, BarChart3, Package, Warehouse } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await loginUser(email, password);
      login(data);
      router.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.15),transparent_50%)]" />
      </div>

      <div className="relative hidden w-1/2 flex-col justify-between p-12 lg:flex">
        <Image
          src="/images/logo/logo.svg"
          alt="Nextera Inventory Solution logo"
          width={240}
          height={44}
          className="h-11 w-auto"
          priority
        />

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
              Modern inventory
              <br />
              management
            </h1>
            <p className="mt-4 max-w-md text-lg text-slate-300">
              Track products, sales, purchases, warehouse stock, and financial reports from one unified platform.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              { icon: Package, title: "Product Catalog", desc: "Manage stock levels and categories" },
              { icon: BarChart3, title: "Sales Analytics", desc: "Real-time revenue and profit insights" },
              { icon: Warehouse, title: "Warehouse Control", desc: "Lot-level inventory tracking" },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="text-sm text-slate-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-slate-500">© 2026 Nextera Inventory Solution</p>
      </div>

      <div className="relative flex w-full items-center justify-center p-6 lg:w-1/2 lg:p-12">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-elevated lg:p-10">
          <div className="mb-8 lg:hidden">
            <Image
              src="/images/logo/logo-dark.svg"
              alt="Nextera Inventory Solution logo"
              width={220}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
            <p className="mt-2 text-slate-500">Sign in to continue to your dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="admin@nextera.com"
                  className="input-modern pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="input-modern pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Demo: admin@nextera.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
