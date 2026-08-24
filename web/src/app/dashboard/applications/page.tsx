"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, isTrackableCategory } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import StatusBadge from "@/components/StatusBadge";

export default function ApplicationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<any[] | null>(null);
  const [error, setError] = useState("");
  const [startingId, setStartingId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [startOdo, setStartOdo] = useState("");

  async function startRental(applicationId: string) {
    setError("");
    try {
      await api("/rentals", {
        method: "POST",
        body: JSON.stringify({
          applicationId,
          dueAt: new Date(dueAt).toISOString(),
          ...(startOdo ? { startOdometer: Number(startOdo) } : {}),
        }),
      });
      router.push("/dashboard/rentals");
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  function load() {
    api<{ applications: any[] }>("/applications").then((d) => setApplications(d.applications)).catch(() => setApplications([]));
  }

  async function update(id: string, status: string) {
    setError("");
    try {
      await api(`/applications/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!user) return null;
  const isOwnerSide = (a: any) => a.listing?.ownerId === user.id;

  return (
    <div>
      <h1 className="text-2xl font-bold">Applications</h1>
      <p className="text-sm text-gray-500">
        Approving an application automatically marks the property as Reserved.
      </p>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {applications === null ? (
        <div className="card mt-6 p-10 text-center text-gray-400">Loading…</div>
      ) : applications.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-gray-500">
          <p className="text-3xl">📄</p>
          <p className="mt-2">No applications yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {applications.map((a) => {
            const owner = isOwnerSide(a);
            const actionable = ["SUBMITTED", "UNDER_REVIEW", "INFO_NEEDED"].includes(a.status);
            return (
              <div key={a.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <StatusBadge status={a.status} />
                    <p className="mt-1.5 font-semibold">{a.listing.title}</p>
                    <p className="text-sm text-gray-600">
                      Move-in {new Date(a.moveInDate).toLocaleDateString()} · {a.occupants} occupant{a.occupants === 1 ? "" : "s"} · {a.stayMonths}-month stay
                    </p>
                    {owner && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        Applicant: {a.renter.name} ({a.renter.email}
                        {a.renter.phone ? `, ${a.renter.phone}` : ""})
                        {a.renter.verifiedIdentity && " · Identity Verified"}
                        {a.incomeRange && ` · Income: ${a.incomeRange}`}
                        {a.employment && ` · ${a.employment}`}
                      </p>
                    )}
                    {a.message && <p className="mt-1 text-sm text-gray-500">“{a.message}”</p>}
                    {a.ownerNote && !owner && (
                      <p className="mt-1 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">Owner note: {a.ownerNote}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {owner && actionable && (
                      <>
                        <button className="btn-primary" onClick={() => update(a.id, "APPROVED")}>Approve</button>
                        <button className="btn-secondary" onClick={() => update(a.id, "INFO_NEEDED")}>Request Info</button>
                        <button className="btn-secondary" onClick={() => update(a.id, "DECLINED")}>Decline</button>
                      </>
                    )}
                    {owner && a.status === "APPROVED" && isTrackableCategory(a.listing.category) && (
                      <button
                        className="btn-primary"
                        onClick={() => {
                          setStartingId(startingId === a.id ? "" : a.id);
                          const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
                          d.setMinutes(0, 0, 0);
                          setDueAt(d.toISOString().slice(0, 16));
                        }}
                      >
                        🚗 Start Rental Tracking
                      </button>
                    )}
                    {!owner && actionable && (
                      <button className="btn-secondary" onClick={() => update(a.id, "WITHDRAWN")}>Withdraw</button>
                    )}
                  </div>
                </div>

                {/* start-rental panel */}
                {owner && startingId === a.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
                    <div>
                      <label className="label">Due back</label>
                      <input type="datetime-local" className="input" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Odometer out (km, optional)</label>
                      <input type="number" min={0} className="input w-36" value={startOdo} onChange={(e) => setStartOdo(e.target.value)} placeholder="—" />
                    </div>
                    <button className="btn-primary" disabled={!dueAt} onClick={() => startRental(a.id)}>
                      Start Tracking
                    </button>
                    <p className="basis-full text-xs text-gray-500">
                      Marks the listing as Occupied and opens a tracked rental — the renter can share their live trip
                      location with you.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
