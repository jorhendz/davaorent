"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

type NavItem = { href: string; label: string; icon: string; exact?: boolean };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) return <div className="py-20 text-center text-gray-400">Loading…</div>;

  const isOwner = ["OWNER", "AGENCY", "ADMIN"].includes(user.role);

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Overview", icon: "🏠", exact: true },
    ...(isOwner
      ? [
          { href: "/dashboard/listings", label: "My Properties", icon: "🏘️" },
          { href: "/dashboard/listings/new", label: "Add Listing", icon: "➕", exact: true },
          { href: "/dashboard/promotions", label: "Promotions", icon: "⭐" },
        ]
      : []),
    { href: "/dashboard/messages", label: "Messages", icon: "💬" },
    { href: "/dashboard/viewings", label: "Viewings", icon: "📅" },
    { href: "/dashboard/applications", label: "Applications", icon: "📄" },
    { href: "/dashboard/saved", label: "Saved Rentals", icon: "❤️" },
  ];

  const isActive = (item: NavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || (pathname?.startsWith(item.href + "/") && pathname !== "/dashboard/listings/new");

  return (
    <div className="mx-auto flex max-w-7xl gap-0 px-4 py-6 lg:gap-8">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="card sticky top-24 p-3">
          <div className="flex items-center gap-2.5 border-b border-gray-100 px-3 pb-3 pt-1">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-gray-500">
                {user.role === "AGENCY" ? "Agency" : user.role === "OWNER" ? "Property Owner" : user.role === "ADMIN" ? "Administrator" : "Renter"}
              </p>
            </div>
          </div>
          <nav className="mt-2 space-y-0.5">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive(item)
                    ? "bg-brand-50 text-brand-800"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          {isOwner && (
            <div className="mt-3 border-t border-gray-100 px-3 pt-3">
              <Link href="/dashboard/listings/new" className="btn-primary w-full">
                + New Listing
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile nav + content */}
      <div className="w-full min-w-0">
        <nav className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1.5 lg:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
                isActive(item) ? "bg-brand-50 text-brand-800" : "text-gray-600"
              }`}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
