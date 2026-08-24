"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import StatusBadge from "@/components/StatusBadge";

export default function ViewingsPage() {
  const { user } = useAuth();
  const [viewings, setViewings] = useState<any[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) load();
  }, [user]);

  function load() {
    api<{ viewings: any[] }>("/viewings").then((d) => setViewings(d.viewings)).catch(() => setViewings([]));
  }

  async function update(id: string, status: string) {
    setError("");
    try {
      await api(`/viewings/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!user) return null;
  const isOwnerSide = (v: any) => v.listing?.ownerId === user.id;

  return (
    <div>
      <h1 className="text-2xl font-bold">Viewings</h1>
      <p className="text-sm text-gray-500">
        The exact address is shared with the renter once the owner confirms the viewing.
      </p>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {viewings === null ? (
        <div className="card mt-6 p-10 text-center text-gray-400">Loading…</div>
      ) : viewings.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-gray-500">
          <p className="text-3xl">📅</p>
          <p className="mt-2">No viewing requests yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {viewings.map((v) => {
            const owner = isOwnerSide(v);
            return (
              <div key={v.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={v.status} />
                      <span className="badge bg-gray-100 text-gray-600">{v.virtual ? "Virtual" : "In-person"}</span>
                    </div>
                    <p className="mt-1.5 font-semibold">{v.listing.title}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(v.preferredDate).toLocaleString("en-PH", { dateStyle: "full", timeStyle: "short" })}
                      {owner && ` · Renter: ${v.renter.name}${v.renter.phone ? ` (${v.renter.phone})` : ""}`}
                      {v.visitors > 1 && ` · ${v.visitors} visitors`}
                    </p>
                    {v.note && <p className="mt-1 text-sm text-gray-500">“{v.note}”</p>}
                    {!owner && v.status === "CONFIRMED" && v.listing.addressFull && (
                      <p className="mt-1 rounded-lg bg-brand-50 px-3 py-1.5 text-sm text-brand-800">
                        📍 {v.listing.addressFull}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {owner && v.status === "REQUESTED" && (
                      <>
                        <button className="btn-primary" onClick={() => update(v.id, "CONFIRMED")}>Accept</button>
                        <button className="btn-secondary" onClick={() => update(v.id, "DECLINED")}>Decline</button>
                      </>
                    )}
                    {owner && v.status === "CONFIRMED" && (
                      <>
                        <button className="btn-secondary" onClick={() => update(v.id, "COMPLETED")}>Mark Completed</button>
                        <button className="btn-secondary" onClick={() => update(v.id, "NO_SHOW")}>No-show</button>
                      </>
                    )}
                    {!owner && ["REQUESTED", "CONFIRMED"].includes(v.status) && (
                      <button className="btn-secondary" onClick={() => update(v.id, "CANCELLED")}>Cancel</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
