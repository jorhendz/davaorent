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
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold text-brand-700 sm:text-xl">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">D</span>
          DavaoRent
        </Link>

        <nav className="no-scrollbar flex items-center gap-0.5 overflow-x-auto text-sm font-medium sm:gap-2">
          <Link
            href="/search"
            className="whitespace-nowrap rounded-lg px-2.5 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 sm:px-3"
          >
            Browse
          </Link>

          {loading ? null : user ? (
            <>
              {(user.role === "OWNER" || user.role === "AGENCY") && (
                <Link
                  href="/dashboard/listings"
                  className="hidden whitespace-nowrap rounded-lg px-2.5 py-2 text-gray-600 hover:bg-gray-100 sm:block sm:px-3"
                >
                  My Listings
                </Link>
              )}
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="whitespace-nowrap rounded-lg px-2.5 py-2 text-gray-600 hover:bg-gray-100 sm:px-3"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/dashboard"
                className="whitespace-nowrap rounded-lg px-2.5 py-2 text-gray-600 hover:bg-gray-100 sm:px-3"
              >
                Dashboard
              </Link>
              <NotificationBell />
              <button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="btn-secondary whitespace-nowrap px-3"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="whitespace-nowrap rounded-lg px-2.5 py-2 text-gray-600 hover:bg-gray-100 sm:px-3"
              >
                Log in
              </Link>
              <Link href="/register" className="btn-primary whitespace-nowrap px-3 sm:px-4">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
