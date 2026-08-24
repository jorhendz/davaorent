"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Listing, peso, rateSuffixShort } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import StatusBadge from "@/components/StatusBadge";

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const [mine, setMine] = useState<Listing[] | null>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [viewings, setViewings] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);

  const isOwner = !!user && ["OWNER", "AGENCY", "ADMIN"].includes(user.role);

  useEffect(() => {
    if (!user) return;
    api<{ favorites: any[] }>("/favorites").then((d) => setFavorites(d.favorites)).catch(() => {});
    api<{ inquiries: any[] }>("/inquiries").then((d) => setInquiries(d.inquiries)).catch(() => {});
    api<{ viewings: any[] }>("/viewings").then((d) => setViewings(d.viewings)).catch(() => {});
    api<{ applications: any[] }>("/applications").then((d) => setApplications(d.applications)).catch(() => {});
    if (["OWNER", "AGENCY", "ADMIN"].includes(user.role)) {
      api<{ listings: Listing[] }>("/listings/mine").then((d) => setMine(d.listings)).catch(() => setMine([]));
    }
  }, [user]);

  if (!user) return null;

  const upcomingViewings = viewings.filter((v) => ["REQUESTED", "CONFIRMED"].includes(v.status));
  const activeApplications = applications.filter((a) => ["SUBMITTED", "UNDER_REVIEW", "INFO_NEEDED"].includes(a.status));

  // Owner aggregates
  const published = mine?.filter((l) => l.status === "PUBLISHED") ?? [];
  const totals = (mine ?? []).reduce(
    (t, l) => ({
      views: t.views + (l.views || 0),
      inquiries: t.inquiries + (l._count?.inquiries ?? 0),
      applications: t.applications + (l._count?.applications ?? 0),
      saves: t.saves + (l._count?.favorites ?? 0),
    }),
    { views: 0, inquiries: 0, applications: 0, saves: 0 }
  );
  const topListings = [...(mine ?? [])].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hello, {user.name.split(" ")[0]}! 👋</h1>
        <p className="text-sm text-gray-500">
          {isOwner ? "Here's how your properties are performing." : "Here's what's happening with your rental search."}
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {(isOwner
          ? [
              { label: "Live listings", value: published.length, sub: `${mine?.length ?? "…"} total`, href: "/dashboard/listings" },
              { label: "Total views", value: totals.views, sub: `${totals.saves} saves`, href: "/dashboard/listings" },
              { label: "Inquiries", value: totals.inquiries, sub: "conversations started", href: "/dashboard/messages" },
              { label: "Applications", value: totals.applications, sub: `${activeApplications.length} need action`, href: "/dashboard/applications" },
            ]
          : [
              { label: "Saved rentals", value: favorites.length, sub: "in your shortlist", href: "/dashboard/saved" },
              { label: "Conversations", value: inquiries.length, sub: "with owners", href: "/dashboard/messages" },
              { label: "Upcoming viewings", value: upcomingViewings.length, sub: `${viewings.length} total`, href: "/dashboard/viewings" },
              { label: "Active applications", value: activeApplications.length, sub: `${applications.length} total`, href: "/dashboard/applications" },
            ]
        ).map((t) => (
          <Link key={t.label} href={t.href} className="card p-5 transition hover:shadow-md">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{t.value}</p>
            <p className="mt-1 text-xs text-gray-500">{t.sub}</p>
          </Link>
        ))}
      </div>

      {isOwner ? (
        <>
          {/* Listing performance */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="font-semibold">Listing performance</h2>
              <Link href="/dashboard/listings" className="text-sm font-medium text-brand-600 hover:underline">
                Manage all →
              </Link>
            </div>
            {mine === null ? (
              <p className="p-8 text-center text-gray-400">Loading…</p>
            ) : mine.length === 0 ? (
              <div className="p-10 text-center text-gray-500">
                <p className="text-3xl">🏘️</p>
                <p className="mt-2 font-medium">You haven't listed a property yet.</p>
                <p className="mt-1 text-sm">List your first property free — it takes about 5 minutes.</p>
                <Link href="/dashboard/listings/new" className="btn-primary mt-4 inline-flex">
                  + Add your first listing
                </Link>
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-2.5">Property</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Views</th>
                      <th className="px-3 py-2.5 text-right">Inquiries</th>
                      <th className="px-3 py-2.5 text-right">Saves</th>
                      <th className="px-3 py-2.5 text-right">Applications</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {topListings.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50/60">
                        <td className="max-w-[260px] px-5 py-3">
                          <Link href={`/listings/${l.id}`} className="block truncate font-medium hover:text-brand-700">
                            {l.title}
                          </Link>
                          <p className="text-xs text-gray-500">{peso(l.price)}{rateSuffixShort(l)}</p>
                        </td>
                        <td className="px-3 py-3"><StatusBadge status={l.status} /></td>
                        <td className="px-3 py-3 text-right tabular-nums">{l.views}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{l._count?.inquiries ?? 0}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{l._count?.favorites ?? 0}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{l._count?.applications ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Needs attention */}
          {(upcomingViewings.length > 0 || activeApplications.length > 0) && (
            <div className="grid gap-6 xl:grid-cols-2">
              {upcomingViewings.length > 0 && (
                <div className="card p-5">
                  <h2 className="font-semibold">Upcoming viewings</h2>
                  <ul className="mt-3 space-y-2">
                    {upcomingViewings.slice(0, 4).map((v) => (
                      <li key={v.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{v.listing.title}</span>
                        <span className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
                          {new Date(v.preferredDate).toLocaleDateString()} <StatusBadge status={v.status} />
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/dashboard/viewings" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
                    Manage viewings →
                  </Link>
                </div>
              )}
              {activeApplications.length > 0 && (
                <div className="card p-5">
                  <h2 className="font-semibold">Applications awaiting review</h2>
                  <ul className="mt-3 space-y-2">
                    {activeApplications.slice(0, 4).map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{a.listing.title}</span>
                        <StatusBadge status={a.status} />
                      </li>
                    ))}
                  </ul>
                  <Link href="/dashboard/applications" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
                    Review applications →
                  </Link>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Renter: recent saves */
        favorites.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recently saved</h2>
              <Link href="/dashboard/saved" className="text-sm font-medium text-brand-600 hover:underline">
                View all →
              </Link>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {favorites.slice(0, 3).map((f) => (
                <Link key={f.id} href={`/listings/${f.listing.id}`} className="card flex gap-3 p-3 hover:shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.listing.photos?.[0]?.url} alt="" className="h-20 w-24 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{f.listing.title}</p>
                    <p className="text-sm text-brand-700">{peso(f.listing.price)}{rateSuffixShort(f.listing)}</p>
                    <p className="text-xs text-gray-500">{f.listing.barangay}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
