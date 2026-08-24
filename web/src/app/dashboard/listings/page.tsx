"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, categoryLabel, Listing, peso, rateSuffixShort } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import StatusBadge from "@/components/StatusBadge";

export default function MyListingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user && !["OWNER", "AGENCY", "ADMIN"].includes(user.role)) router.push("/dashboard");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) refresh();
  }, [user]);

  function refresh() {
    api<{ listings: Listing[] }>("/listings/mine")
      .then((d) => setListings(d.listings))
      .catch((e) => setError(e.message));
  }

  async function act(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!user) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Properties</h1>
          <p className="text-sm text-gray-500">Manage listings, availability, and submissions.</p>
        </div>
        <Link href="/dashboard/listings/new" className="btn-primary">
          + Add Listing
        </Link>
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {listings === null ? (
        <div className="card mt-6 p-10 text-center text-gray-400">Loading…</div>
      ) : listings.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-gray-500">
          <p className="text-3xl">🏘️</p>
          <p className="mt-2">You have no listings yet.</p>
          <Link href="/dashboard/listings/new" className="btn-primary mt-4 inline-flex">
            Create your first listing
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {listings.map((l) => (
            <div key={l.id} className="card p-4">
              <div className="flex flex-wrap gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.photos?.[0]?.url} alt="" className="h-24 w-32 rounded-lg bg-gray-100 object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={l.status} />
                    {l.status === "PUBLISHED" && <StatusBadge status={l.availability} />}
                    {l.featured && <span className="badge bg-amber-100 text-amber-800">Featured</span>}
                    {l.verifiedProperty && <span className="badge bg-brand-100 text-brand-800">Property Verified</span>}
                  </div>
                  <p className="mt-1 font-semibold">{l.title}</p>
                  <p className="text-sm text-gray-500">
                    {categoryLabel(l.category)} · {peso(l.price)}{rateSuffixShort(l)} · {l.barangay}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {l.views} views · {l._count?.inquiries ?? 0} inquiries · {l._count?.viewings ?? 0} viewings ·{" "}
                    {l._count?.applications ?? 0} applications · {l._count?.favorites ?? 0} saves
                  </p>
                  {l.status === "PUBLISHED" && l.expiresAt && <ExpiryNote expiresAt={l.expiresAt} />}
                  {l.status === "NEEDS_REVISION" && l.adminNote && (
                    <p className="mt-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                      Admin note: {l.adminNote}
                    </p>
                  )}
                  {l.status === "REJECTED" && l.adminNote && (
                    <p className="mt-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700">
                      Rejection reason: {l.adminNote}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-stretch justify-center gap-2 sm:items-end">
                  {["DRAFT", "NEEDS_REVISION"].includes(l.status) && (
                    <button
                      className="btn-primary"
                      onClick={() => act(() => api(`/listings/${l.id}/submit`, { method: "POST" }))}
                    >
                      Submit for Review
                    </button>
                  )}
                  {l.status === "PUBLISHED" && (
                    <select
                      className="input w-40"
                      value={l.availability}
                      onChange={(e) =>
                        act(() =>
                          api(`/listings/${l.id}/availability`, {
                            method: "POST",
                            body: JSON.stringify({ availability: e.target.value }),
                          })
                        )
                      }
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="RESERVED">Reserved</option>
                      <option value="OCCUPIED">Occupied</option>
                    </select>
                  )}
                  {l.status === "PUBLISHED" && (
                    <button
                      className="btn-secondary"
                      onClick={() => act(() => api(`/listings/${l.id}/renew`, { method: "POST" }))}
                    >
                      ⟳ Renew 30 days
                    </button>
                  )}
                  <div className="flex gap-3 text-sm">
                    <Link href={`/dashboard/listings/${l.id}/edit`} className="font-medium text-brand-600 hover:underline">
                      ✏️ Edit
                    </Link>
                    <Link href={`/listings/${l.id}`} className="text-gray-500 hover:underline">
                      View →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExpiryNote({ expiresAt }: { expiresAt: string }) {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0)
    return (
      <p className="mt-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700">
        ⚠ This listing has expired and is hidden from search — renew it to bring it back.
      </p>
    );
  if (days <= 7)
    return (
      <p className="mt-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
        ⏳ Expires in {days} day{days === 1 ? "" : "s"} — renew to keep it visible in search.
      </p>
    );
  return <p className="mt-1 text-xs text-gray-400">Active for {days} more days</p>;
}
