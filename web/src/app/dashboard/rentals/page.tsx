"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, categoryLabel, isRentalOverdue, Rental } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const PING_INTERVAL_MS = 45_000;

export default function RentalTrackerPage() {
  const { user } = useAuth();
  const [rentals, setRentals] = useState<Rental[] | null>(null);
  const [selected, setSelected] = useState<Rental | null>(null);
  const [error, setError] = useState("");

  // owner action state
  const [endOdo, setEndOdo] = useState("");
  const [newDue, setNewDue] = useState("");

  // renter location sharing
  const [sharing, setSharing] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [shareError, setShareError] = useState("");
  const watchId = useRef<number | null>(null);
  const lastPost = useRef(0);
  const selectedId = useRef<string | null>(null);

  const loadList = useCallback(() => {
    api<{ rentals: Rental[] }>("/rentals").then((d) => setRentals(d.rentals)).catch(() => setRentals([]));
  }, []);

  const openRental = useCallback(async (id: string) => {
    selectedId.current = id;
    try {
      const d = await api<{ rental: Rental }>(`/rentals/${id}`);
      setSelected(d.rental);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (user) loadList();
  }, [user, loadList]);

  // owners watching an active rental: refresh pings every 60s
  useEffect(() => {
    if (!selected || selected.status !== "ACTIVE" || selected.owner.id !== user?.id) return;
    const t = setInterval(() => openRental(selected.id), 60_000);
    return () => clearInterval(t);
  }, [selected, user, openRental]);

  // cleanup geolocation watcher on unmount
  useEffect(() => stopSharing, []);

  function stopSharing() {
    if (watchId.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setSharing(false);
  }

  function startSharing(rentalId: string) {
    setShareError("");
    if (!("geolocation" in navigator)) {
      setShareError("This device doesn't support location sharing.");
      return;
    }
    setSharing(true);
    lastPost.current = 0;
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastPost.current < PING_INTERVAL_MS) return;
        lastPost.current = now;
        try {
          await api(`/rentals/${rentalId}/location`, {
            method: "POST",
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? undefined,
            }),
          });
          setLastSent(new Date());
        } catch (e: any) {
          setShareError(e.message || "Failed to send location");
        }
      },
      (err) => {
        setShareError(err.code === 1 ? "Location permission denied — allow it in your browser settings." : err.message);
        stopSharing();
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 30_000 }
    );
  }

  async function ownerUpdate(rentalId: string, body: Record<string, unknown>, refresh = true) {
    setError("");
    try {
      await api(`/rentals/${rentalId}`, { method: "PATCH", body: JSON.stringify(body) });
      if (refresh) {
        loadList();
        openRental(rentalId);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!user) return null;

  const last = selected?.points?.[0];
  const isOwnerView = selected?.owner.id === user.id;
  const isRenterView = selected?.renter.id === user.id;

  return (
    <div>
      <h1 className="text-2xl font-bold">Rental Tracker 🚗</h1>
      <p className="text-sm text-gray-500">
        Handover tracking for vehicles & equipment — due dates, odometer, and live trip location.
      </p>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {rentals === null ? (
        <div className="card mt-6 p-10 text-center text-gray-400">Loading…</div>
      ) : rentals.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-gray-500">
          <p className="text-3xl">🚗</p>
          <p className="mt-2 font-medium">No tracked rentals yet.</p>
          <p className="mt-1 text-sm">
            When you approve an application on a vehicle or equipment listing, start tracking from the{" "}
            <Link href="/dashboard/applications" className="text-brand-600 hover:underline">
              Applications
            </Link>{" "}
            page.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* list */}
          <div className="space-y-2">
            {rentals.map((r) => {
              const overdue = isRentalOverdue(r);
              return (
                <button
                  key={r.id}
                  onClick={() => openRental(r.id)}
                  className={`card block w-full p-3 text-left transition hover:shadow-md ${
                    selected?.id === r.id ? "ring-2 ring-brand-500" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.listing.photos?.[0]?.url} alt="" className="h-11 w-14 rounded-md bg-gray-100 object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.listing.title}</p>
                      <p className="text-xs text-gray-500">
                        {r.owner.id === user.id ? `Renter: ${r.renter.name}` : `Owner: ${r.owner.name}`}
                      </p>
                    </div>
                    <RentalBadge status={overdue ? "OVERDUE" : r.status} />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">
                    Due {new Date(r.dueAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
                    {r._count ? ` · ${r._count.points} location ping${r._count.points === 1 ? "" : "s"}` : ""}
                  </p>
                </button>
              );
            })}
          </div>

          {/* detail */}
          {selected ? (
            <div className="card h-fit p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <RentalBadge status={isRentalOverdue(selected) ? "OVERDUE" : selected.status} />
                    <span className="badge bg-gray-100 text-gray-600">{categoryLabel(selected.listing.category)}</span>
                  </div>
                  <h2 className="mt-1.5 font-bold">{selected.listing.title}</h2>
                  <p className="text-sm text-gray-500">
                    {isOwnerView ? `Rented by ${selected.renter.name}` : `From ${selected.owner.name}`}
                    {isOwnerView && selected.renter.phone ? ` · ${selected.renter.phone}` : ""}
                  </p>
                </div>
                <Link href={`/listings/${selected.listing.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                  View listing →
                </Link>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <InfoTile label="Started" value={new Date(selected.startAt).toLocaleDateString("en-PH")} />
                <InfoTile
                  label="Due back"
                  value={new Date(selected.dueAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
                  alert={isRentalOverdue(selected)}
                />
                <InfoTile label="Odometer out" value={selected.startOdometer != null ? `${selected.startOdometer} km` : "—"} />
                <InfoTile
                  label={selected.status === "ACTIVE" ? "Status" : "Odometer in"}
                  value={selected.status === "ACTIVE" ? "On rent" : selected.endOdometer != null ? `${selected.endOdometer} km` : "—"}
                />
              </dl>
              {selected.note && <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">📝 {selected.note}</p>}

              {/* ============ location tracking ============ */}
              <h3 className="mt-6 font-semibold">📍 Trip location</h3>

              {isRenterView && selected.status === "ACTIVE" && (
                <div className="mt-2 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
                  {sharing ? (
                    <>
                      <p className="flex items-center gap-2 text-sm font-semibold text-brand-800">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-600" />
                        Sharing your location with the owner
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {lastSent ? `Last sent ${lastSent.toLocaleTimeString()}` : "Waiting for GPS fix…"} · updates every ~45s
                        while this page is open.
                      </p>
                      <button onClick={stopSharing} className="btn-secondary mt-3">
                        Stop sharing
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-700">
                        Share your live location with the owner during this rental. Only shared while this page is open.
                      </p>
                      <button onClick={() => startSharing(selected.id)} className="btn-primary mt-3">
                        Start sharing my location
                      </button>
                    </>
                  )}
                  {shareError && <p className="mt-2 text-xs text-red-600">{shareError}</p>}
                </div>
              )}

              {last ? (
                <div className="mt-3">
                  <iframe
                    title="Last known location"
                    className="h-56 w-full rounded-xl border border-gray-200"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${last.lng - 0.008}%2C${last.lat - 0.005}%2C${last.lng + 0.008}%2C${last.lat + 0.005}&layer=mapnik&marker=${last.lat}%2C${last.lng}`}
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                    <span>
                      Last ping {new Date(last.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "medium" })}
                      {last.accuracy ? ` (±${Math.round(last.accuracy)}m)` : ""}
                    </span>
                    <a
                      href={`https://maps.google.com/?q=${last.lat},${last.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-brand-600 hover:underline"
                    >
                      Open in Google Maps →
                    </a>
                  </div>
                  {selected.points && selected.points.length > 1 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-gray-400 hover:text-gray-600">
                        Ping history ({selected.points.length})
                      </summary>
                      <ul className="mt-1.5 max-h-40 space-y-1 overflow-y-auto text-xs text-gray-500">
                        {selected.points.map((p) => (
                          <li key={p.id}>
                            {new Date(p.createdAt).toLocaleTimeString()} — {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                            {p.accuracy ? ` (±${Math.round(p.accuracy)}m)` : ""}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-400">
                  No location shared yet.{" "}
                  {isOwnerView && selected.status === "ACTIVE"
                    ? "The renter can share their live trip location from their dashboard."
                    : ""}
                </p>
              )}

              {/* ============ owner actions ============ */}
              {isOwnerView && selected.status === "ACTIVE" && (
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <h3 className="font-semibold">Owner actions</h3>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div>
                      <label className="label">Extend due date</label>
                      <div className="flex gap-2">
                        <input type="datetime-local" className="input" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
                        <button
                          className="btn-secondary"
                          disabled={!newDue}
                          onClick={() => {
                            ownerUpdate(selected.id, { dueAt: new Date(newDue).toISOString() });
                            setNewDue("");
                          }}
                        >
                          Extend
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label">Odometer on return (km)</label>
                      <div className="flex gap-2">
                        <input type="number" min={0} className="input w-32" value={endOdo} onChange={(e) => setEndOdo(e.target.value)} placeholder="—" />
                        <button
                          className="btn-primary"
                          onClick={() => {
                            ownerUpdate(selected.id, {
                              status: "COMPLETED",
                              ...(endOdo ? { endOdometer: Number(endOdo) } : {}),
                            });
                            setEndOdo("");
                          }}
                        >
                          ✓ Mark Returned
                        </button>
                      </div>
                    </div>
                    <button className="btn-secondary text-red-600" onClick={() => ownerUpdate(selected.id, { status: "CANCELLED" })}>
                      Cancel rental
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card grid min-h-[280px] place-items-center text-sm text-gray-400">
              Select a rental to see its tracking details
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RentalBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    ACTIVE: "bg-brand-100 text-brand-800",
    OVERDUE: "bg-red-100 text-red-700",
    COMPLETED: "bg-gray-200 text-gray-700",
    CANCELLED: "bg-gray-200 text-gray-600",
  };
  return <span className={`badge shrink-0 ${cls[status] || "bg-gray-100"}`}>{status}</span>;
}

function InfoTile({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${alert ? "bg-red-50" : "bg-gray-50"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${alert ? "text-red-700" : "text-gray-800"}`}>{value}</p>
    </div>
  );
}
