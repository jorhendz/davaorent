"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, categoryLabel, Listing, peso, rateSuffixShort } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";

const QUEUE_TABS = [
  ["SUBMITTED", "Awaiting review"],
  ["NEEDS_REVISION", "Needs revision"],
  ["PUBLISHED", "Published"],
  ["REJECTED", "Rejected"],
  ["ARCHIVED", "Archived"],
  ["ALL", "All"],
] as const;

export default function ModerationPage() {
  const { refreshStats } = useAdmin();
  const [status, setStatus] = useState<string>("SUBMITTED");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api<{ listings: Listing[] }>(`/admin/listings?status=${status}`)
      .then((d) => setListings(d.listings))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(load, [load]);

  async function act(id: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    setError("");
    try {
      await fn();
      load();
      refreshStats();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  function moderate(id: string, action: string) {
    let note: string | undefined;
    if (action === "NEEDS_REVISION" || action === "REJECT") {
      note = window.prompt("Note to the owner (optional):") || undefined;
    }
    act(id, () => api(`/admin/listings/${id}`, { method: "PATCH", body: JSON.stringify({ action, note }) }));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Listing Moderation</h1>
      <p className="text-sm text-gray-500">Every listing is reviewed before it appears in search.</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {QUEUE_TABS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              status === value ? "bg-brand-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="card mt-4 p-10 text-center text-gray-400">Loading…</div>
      ) : listings.length === 0 ? (
        <div className="card mt-4 p-10 text-center text-gray-500">
          {status === "SUBMITTED" ? "🎉 Queue is clear — nothing awaiting review." : "Nothing in this queue."}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {listings.map((l) => (
            <div key={l.id} className={`card p-4 ${busyId === l.id ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.photos?.[0]?.url} alt="" className="h-28 w-40 rounded-lg bg-gray-100 object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="badge bg-gray-100 text-gray-700">{categoryLabel(l.category)}</span>
                    {l.featured && <span className="badge bg-amber-100 text-amber-800">Featured</span>}
                    {l.verifiedProperty && <span className="badge bg-brand-100 text-brand-800">Property Verified</span>}
                    {(l._count?.reports ?? 0) > 0 && (
                      <span className="badge bg-red-100 text-red-700">⚠ {l._count!.reports} report(s)</span>
                    )}
                  </div>
                  <p className="mt-1.5 font-semibold">{l.title}</p>
                  <p className="text-sm text-gray-600">
                    {peso(l.price)}{rateSuffixShort(l)} · deposit {peso(l.deposit)} · {l.barangay}, {l.district} District
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Owner: {(l as any).owner?.name} ({(l as any).owner?.email})
                    {(l as any).owner?.verifiedIdentity ? " · Identity Verified" : " · identity NOT verified"}
                  </p>
                  <p className="text-xs text-gray-400">Private address: {l.addressFull}</p>
                  <p className="mt-1.5 line-clamp-2 text-xs text-gray-500">{l.description}</p>
                  <Link href={`/listings/${l.id}`} className="mt-1 inline-block text-xs font-medium text-brand-600 hover:underline">
                    Open full listing →
                  </Link>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                {l.status !== "PUBLISHED" && (
                  <button className="btn-primary" disabled={!!busyId} onClick={() => moderate(l.id, "APPROVE")}>
                    ✓ Approve & Publish
                  </button>
                )}
                {["SUBMITTED", "PUBLISHED"].includes(l.status) && (
                  <button className="btn-secondary" disabled={!!busyId} onClick={() => moderate(l.id, "NEEDS_REVISION")}>
                    Request Revision
                  </button>
                )}
                <button className="btn-secondary" disabled={!!busyId} onClick={() => moderate(l.id, "REJECT")}>
                  Reject
                </button>
                <span className="mx-1 hidden h-5 w-px bg-gray-200 sm:block" />
                <button
                  className="btn-secondary"
                  disabled={!!busyId}
                  onClick={() =>
                    act(l.id, () =>
                      api(`/admin/listings/${l.id}/verify`, {
                        method: "PATCH",
                        body: JSON.stringify({ verifiedProperty: !l.verifiedProperty }),
                      })
                    )
                  }
                >
                  {l.verifiedProperty ? "Remove Property Badge" : "Grant Property Badge"}
                </button>
                {l.status === "PUBLISHED" && (
                  <button
                    className="btn-secondary"
                    disabled={!!busyId}
                    onClick={() =>
                      act(l.id, () =>
                        api(`/admin/listings/${l.id}/feature`, {
                          method: "PATCH",
                          body: JSON.stringify({ featured: !l.featured, days: 30 }),
                        })
                      )
                    }
                  >
                    {l.featured ? "Unfeature" : "Feature for 30 days"}
                  </button>
                )}
                {l.adminNote && <span className="ml-auto text-xs text-gray-400">Last note: {l.adminNote}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
