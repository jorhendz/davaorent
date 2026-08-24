"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AdminContext, AdminStats } from "@/lib/admin-context";

const NAV = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/moderation", label: "Moderation", icon: "🗂️", badge: "pendingReview" as const },
  { href: "/admin/reports", label: "Reports", icon: "🚩", badge: "openReports" as const },
  { href: "/admin/users", label: "Users", icon: "👥" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) router.push("/login?next=/admin");
  }, [loading, user, router]);

  const refreshStats = useCallback(() => {
    api<{ stats: AdminStats }>("/admin/stats")
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.role === "ADMIN") refreshStats();
  }, [user, refreshStats]);

  if (loading || !user || user.role !== "ADMIN")
    return <div className="py-20 text-center text-gray-400">Loading…</div>;

  return (
    <AdminContext.Provider value={{ stats, refreshStats }}>
      <div className="mx-auto flex max-w-7xl gap-0 px-4 py-6 lg:gap-8">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 rounded-2xl bg-brand-900 p-3 text-white">
            <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-brand-100/60">
              Admin Console
            </p>
            <nav className="space-y-1">
              {NAV.map((item) => {
                const active = pathname === item.href;
                const badge = item.badge && stats ? stats[item.badge] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      active ? "bg-white/15 text-white" : "text-brand-100/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {badge > 0 && (
                      <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 border-t border-white/10 px-3 pt-3 text-xs text-brand-100/60">
              Signed in as
              <p className="truncate font-medium text-brand-100">{user.name}</p>
            </div>
          </div>
        </aside>

        {/* Mobile nav */}
        <div className="w-full min-w-0">
          <nav className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-brand-900 p-1.5 lg:hidden">
            {NAV.map((item) => {
              const active = pathname === item.href;
              const badge = item.badge && stats ? stats[item.badge] : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                    active ? "bg-white/15 text-white" : "text-brand-100/80"
                  }`}
                >
                  {item.label}
                  {badge > 0 && (
                    <span className="rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-amber-950">{badge}</span>
                  )}
                </Link>
              );
            })}
          </nav>
          {children}
        </div>
      </div>
    </AdminContext.Provider>
  );
}
