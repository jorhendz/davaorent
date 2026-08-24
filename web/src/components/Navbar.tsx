"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-brand-700">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">D</span>
          DavaoRent
        </Link>

        <nav className="flex items-center gap-2 text-sm font-medium sm:gap-4">
          <Link href="/search" className="rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900">
            Browse Rentals
          </Link>

          {loading ? null : user ? (
            <>
              {(user.role === "OWNER" || user.role === "AGENCY") && (
                <Link href="/dashboard/listings" className="rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100">
                  My Listings
                </Link>
              )}
              {user.role === "ADMIN" && (
                <Link href="/admin" className="rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100">
                  Admin
                </Link>
              )}
              <Link href="/dashboard" className="rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100">
                Dashboard
              </Link>
              <NotificationBell />
              <button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="btn-secondary"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100">
                Log in
              </Link>
              <Link href="/register" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
