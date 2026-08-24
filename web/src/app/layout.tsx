import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "DavaoRent — Find Your Next Space in Davao",
  description:
    "Find verified rentals, connect with local property owners, and rent with greater confidence. Apartments, rooms, condos, houses, and commercial spaces in Davao City.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <footer className="relative mt-20 overflow-hidden rounded-t-[2.5rem] bg-brand-900 text-brand-100">
            {/* glow accents */}
            <span aria-hidden className="pointer-events-none absolute -top-16 right-[15%] h-56 w-56 rounded-full bg-teal-500/15 blur-3xl" />
            <span aria-hidden className="pointer-events-none absolute -left-10 bottom-10 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />

            {/* faint city silhouette */}
            <svg
              aria-hidden
              viewBox="0 0 1440 240"
              preserveAspectRatio="none"
              className="pointer-events-none absolute bottom-0 left-0 h-40 w-full opacity-[0.06]"
            >
              <path
                d="M0 240 L0 196 L38 196 L38 176 L54 176 L54 196 L92 196 L92 156 L100 148 L108 156 L108 196 L146 196 L146 138 L188 138 L188 196 L216 196 L216 168 L252 168 L252 110 L262 100 L272 110 L272 168 L306 168 L306 196 L342 196 L342 150 L390 150 L390 196 L420 196 L420 124 L466 124 L466 92 L474 84 L482 92 L482 196 L530 196 L530 170 L570 170 L570 196 L610 196 L610 144 L658 144 L658 196 L700 196 L700 156 L716 156 L716 132 L764 132 L764 196 L804 196 L804 172 L850 172 L850 118 L858 108 L866 118 L866 196 L910 196 L910 148 L958 148 L958 196 L1000 196 L1000 162 L1046 162 L1046 102 L1056 92 L1066 102 L1066 196 L1112 196 L1112 176 L1160 176 L1160 138 L1204 138 L1204 196 L1244 196 L1244 158 L1290 158 L1290 196 L1330 196 L1330 172 L1378 172 L1378 196 L1440 196 L1440 240 Z"
                fill="#ffffff"
              />
            </svg>

            <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-10 pt-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
              <div>
                <p className="flex items-center gap-2.5 text-xl font-extrabold text-white">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-base text-brand-800 shadow-lg">
                    D
                  </span>
                  DavaoRent
                </p>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-brand-100/70">
                  Davao&apos;s marketplace for every rental — spaces, vehicles, equipment, and more.
                </p>
                <p className="mt-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-white/15">
                  Find Your Next Space in Davao ✦
                </p>
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-white/90">For Renters</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {[
                    ["Browse rentals", "/search"],
                    ["Compare listings", "/compare"],
                    ["Saved rentals", "/dashboard/saved"],
                    ["Create an account", "/register"],
                  ].map(([label, href]) => (
                    <li key={href}>
                      <a href={href} className="group inline-flex items-center gap-1.5 text-brand-100/70 transition hover:text-white">
                        <span className="text-amber-400/0 transition group-hover:text-amber-400">→</span>
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-white/90">For Owners</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {[
                    ["List anything — free", "/register?role=OWNER"],
                    ["Manage listings", "/dashboard/listings"],
                    ["Featured & pricing", "/dashboard/promotions"],
                  ].map(([label, href]) => (
                    <li key={href}>
                      <a href={href} className="group inline-flex items-center gap-1.5 text-brand-100/70 transition hover:text-white">
                        <span className="text-amber-400/0 transition group-hover:text-amber-400">→</span>
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-white/90">Rent Safely</p>
                <ul className="mt-3 space-y-2.5 text-sm text-brand-100/70">
                  {[
                    "Always view before paying any deposit.",
                    "Keep communication inside DavaoRent.",
                    "Look for Identity & Property Verified badges.",
                  ].map((tip) => (
                    <li key={tip} className="flex items-start gap-2">
                      <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-amber-400/90 text-[10px] font-bold text-amber-950">
                        ✓
                      </span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="relative border-t border-white/10">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-brand-100/50">
                <p>
                  DavaoRent is a marketplace and is not a party to rental agreements. © {new Date().getFullYear()}{" "}
                  DavaoRent.com
                </p>
                <p>Proudly made in Davao City, Philippines 🇵🇭</p>
                <a
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/20"
                  aria-label="Back to top"
                >
                  ↑
                </a>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
