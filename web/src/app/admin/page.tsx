"use client";

import Link from "next/link";
import { categoryLabel, peso, rateSuffixShort } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";
import { HBarChart, WeeklyTrendChart } from "@/components/charts";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PUBLISHED: { label: "Published", cls: "bg-brand-100 text-brand-800" },
  SUBMITTED: { label: "Awaiting review", cls: "bg-blue-100 text-blue-800" },
  DRAFT: { label: "Draft", cls: "bg-gray-200 text-gray-700" },
  NEEDS_REVISION: { label: "Needs revision", cls: "bg-amber-100 text-amber-800" },
  REJECTED: { label: "Rejected", cls: "bg-red-100 text-red-700" },
  ARCHIVED: { label: "Archived", cls: "bg-gray-200 text-gray-600" },
};

export default function AdminOverviewPage() {
  const { stats } = useAdmin();

  if (!stats) return <div className="py-20 text-center text-gray-400">Loading analytics…</div>;

  const kpis = [
    { label: "Total users", value: stats.users, sub: `${stats.renters} renters · ${stats.owners} owners` },
    { label: "Published listings", value: stats.published, sub: `${stats.verified} property-verified` },
    { label: "Inquiries", value: stats.inquiries, sub: `${stats.viewings} viewing requests` },
    { label: "Applications", value: stats.applications, sub: `${stats.confirmedRentals} approved` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-sm text-gray-500">Platform health at a glance.</p>
        </div>
        <div className="flex gap-2">
          {stats.pendingReview > 0 && (
            <Link href="/admin/moderation" className="btn-primary">
              Review {stats.pendingReview} pending listing{stats.pendingReview === 1 ? "" : "s"}
            </Link>
          )}
          {stats.openReports > 0 && (
            <Link href="/admin/reports" className="btn-secondary">
              {stats.openReports} open report{stats.openReports === 1 ? "" : "s"}
            </Link>
          )}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{k.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{k.value}</p>
            <p className="mt-1 text-xs text-gray-500">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Trend + status */}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="card p-5">
          <h2 className="font-semibold">Growth — last 8 weeks</h2>
          <div className="mt-4">
            <WeeklyTrendChart data={stats.weekly} />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Listings by status</h2>
          <ul className="mt-3 space-y-2.5">
            {stats.byStatus.map((s) => {
              const meta = STATUS_META[s.status] || { label: s.status, cls: "bg-gray-100 text-gray-700" };
              return (
                <li key={s.status} className="flex items-center justify-between text-sm">
                  <span className={`badge ${meta.cls}`}>{meta.label}</span>
                  <span className="font-semibold tabular-nums text-gray-800">{s.count}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
            {stats.listings} listings total across all statuses.
          </p>
        </div>
      </div>

      {/* Category + district breakdowns */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">Published listings by property type</h2>
          <div className="mt-4">
            <HBarChart data={stats.byCategory.map((c) => ({ label: categoryLabel(c.category), value: c.count }))} />
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Top districts</h2>
          <div className="mt-4">
            <HBarChart data={stats.byDistrict.map((d) => ({ label: d.district, value: d.count }))} />
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">Latest listings</h2>
          <ul className="mt-3 divide-y divide-gray-100">
            {stats.recentListings.map((l) => {
              const meta = STATUS_META[l.status] || { label: l.status, cls: "bg-gray-100 text-gray-700" };
              return (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link href={`/listings/${l.id}`} className="block truncate font-medium hover:text-brand-700">
                      {l.title}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {l.owner.name} · {peso(l.price)}{rateSuffixShort(l)} · {new Date(l.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`badge shrink-0 ${meta.cls}`}>{meta.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Newest users</h2>
          <ul className="mt-3 divide-y divide-gray-100">
            {stats.recentUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{u.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {u.email} · joined {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="badge shrink-0 bg-gray-100 text-gray-700">{u.role}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
