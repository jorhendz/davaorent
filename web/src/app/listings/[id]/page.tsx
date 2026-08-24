"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, categoryLabel, isPropertyCategory, Listing, peso, rateSuffix } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // action panels
  const [panel, setPanel] = useState<"" | "message" | "viewing" | "apply" | "report">("");
  const [message, setMessage] = useState("");
  const [viewingDate, setViewingDate] = useState("");
  const [viewingVirtual, setViewingVirtual] = useState(false);
  const [appMoveIn, setAppMoveIn] = useState("");
  const [appOccupants, setAppOccupants] = useState(1);
  const [appStay, setAppStay] = useState(6);
  const [appEmployment, setAppEmployment] = useState("");
  const [appIncome, setAppIncome] = useState("");
  const [appMessage, setAppMessage] = useState("");
  const [reportReason, setReportReason] = useState("FAKE_PROPERTY");
  const [reportDetails, setReportDetails] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ listing: Listing }>(`/listings/${id}`)
      .then((d) => setListing(d.listing))
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound)
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-gray-500">Listing not found.</div>;
  if (!listing) return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-gray-400">Loading…</div>;

  const amenities: string[] = safeParse(listing.amenities);
  const houseRules: string[] = safeParse(listing.houseRules);
  const avgRating =
    listing.reviews && listing.reviews.length > 0
      ? listing.reviews.reduce((s, r) => s + r.rating, 0) / listing.reviews.length
      : null;

  function requireLogin(): boolean {
    if (!user) {
      router.push(`/login?next=/listings/${id}`);
      return false;
    }
    return true;
  }

  async function act(fn: () => Promise<void>, successMsg: string) {
    setBusy(true);
    setError("");
    try {
      await fn();
      setNotice(successMsg);
      setPanel("");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Gallery */}
      <div className="grid gap-2 lg:grid-cols-[2fr_1fr]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-gray-100">
          {listing.photos[photoIdx] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.photos[photoIdx].url} alt={listing.title} className="h-full w-full object-cover" />
          )}
          <div className="absolute left-3 top-3 flex gap-1.5">
            {listing.featured && <span className="badge bg-amber-400 text-amber-950">Featured</span>}
            {listing.verifiedProperty && <span className="badge bg-brand-600 text-white">Property Verified</span>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
          {listing.photos.slice(0, 4).map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={p.url}
              alt=""
              onClick={() => setPhotoIdx(i)}
              className={`aspect-[4/3] w-full cursor-pointer rounded-lg object-cover ${
                i === photoIdx ? "ring-2 ring-brand-600" : "opacity-80 hover:opacity-100"
              }`}
            />
          ))}
        </div>
      </div>

      {notice && <div className="mt-4 rounded-lg bg-brand-100 px-4 py-3 text-sm text-brand-900">{notice}</div>}
      {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Main info */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-gray-100 text-gray-700">{categoryLabel(listing.category)}</span>
            <span className="badge bg-gray-100 text-gray-700">{listing.availability}</span>
            {avgRating && (
              <span className="badge bg-amber-100 text-amber-800">
                ★ {avgRating.toFixed(1)} ({listing.reviews!.length})
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold">{listing.title}</h1>
          <p className="mt-1 text-gray-600">
            {listing.barangay}, {listing.district} District, Davao City
            {listing.landmark ? ` · ${listing.landmark}` : ""}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Exact address is shared after the owner confirms your viewing request.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(isPropertyCategory(listing.category)
              ? [
                  ["Bedrooms", listing.bedrooms || "Studio"],
                  ["Bathrooms", listing.bathrooms],
                  ["Floor area", listing.floorArea ? `${listing.floorArea} sqm` : "—"],
                  ["Min. stay", `${listing.minStayMonths} mo`],
                ]
              : [
                  ["Category", categoryLabel(listing.category)],
                  ["Rate", listing.priceUnit === "DAY" ? "Per day" : "Per month"],
                  ["Deposit", listing.deposit ? peso(listing.deposit) : "None"],
                  ["Status", listing.availability],
                ]
            ).map(([k, v]) => (
              <div key={k as string} className="card p-3 text-center">
                <p className="text-xs text-gray-500">{k}</p>
                <p className="font-semibold">{v}</p>
              </div>
            ))}
          </div>

          <section className="mt-6">
            <h2 className="font-bold">About this property</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-700">{listing.description}</p>
          </section>

          <section className="mt-6">
            <h2 className="font-bold">Features</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {[
                [listing.furnished, "Furnished"],
                [listing.aircon, "Air-conditioning"],
                [listing.internet, "Internet available"],
                [listing.parking, "Parking"],
                [listing.petFriendly, "Pet-friendly"],
                [listing.utilitiesIncluded, "Utilities included"],
              ]
                .filter(([on]) => on)
                .map(([, label]) => (
                  <span key={label as string} className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                    {label}
                  </span>
                ))}
              {amenities.map((a) => (
                <span key={a} className="badge bg-gray-100 text-gray-700">
                  {a}
                </span>
              ))}
            </div>
          </section>

          {houseRules.length > 0 && (
            <section className="mt-6">
              <h2 className="font-bold">House rules</h2>
              <ul className="mt-2 list-inside list-disc text-sm text-gray-700">
                {houseRules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Reviews */}
          <section className="mt-8">
            <h2 className="font-bold">Reviews</h2>
            {listing.reviews && listing.reviews.length > 0 ? (
              <div className="mt-3 space-y-3">
                {listing.reviews.map((r) => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{r.author.name}</p>
                      <span className="text-sm text-amber-500">{"★".repeat(r.rating)}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{r.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                No reviews yet. Reviews open after a completed viewing or confirmed rental.
              </p>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="h-fit space-y-4">
          <div className="card p-5">
            <p className="text-2xl font-bold text-brand-700">
              {peso(listing.price)} <span className="text-sm font-normal text-gray-500">{rateSuffix(listing)}</span>
            </p>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <p>Deposit: {listing.deposit ? peso(listing.deposit) : "None"}</p>
              <p>Advance: {listing.advance ? peso(listing.advance) : "None"}</p>
            </div>

            <div className="mt-4 border-t pt-4">
              <p className="text-sm text-gray-500">Listed by</p>
              <p className="font-semibold">{listing.owner?.name}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {listing.owner?.verifiedIdentity && <span className="badge bg-brand-100 text-brand-800">Identity Verified</span>}
                <span className="badge bg-gray-100 text-gray-600">{listing.owner?.role}</span>
              </div>
            </div>

            {user?.id !== listing.owner?.id && (
              <div className="mt-4 space-y-2">
                <button className="btn-primary w-full" onClick={() => requireLogin() && setPanel(panel === "message" ? "" : "message")}>
                  Message Owner
                </button>
                <button className="btn-secondary w-full" onClick={() => requireLogin() && setPanel(panel === "viewing" ? "" : "viewing")}>
                  Request a Viewing
                </button>
                <button className="btn-secondary w-full" onClick={() => requireLogin() && setPanel(panel === "apply" ? "" : "apply")}>
                  Submit Application
                </button>
                <button
                  className="btn-secondary w-full"
                  onClick={() =>
                    requireLogin() &&
                    act(async () => {
                      await api(`/favorites/${listing.id}`, { method: "POST" });
                    }, "Saved to your favourites.")
                  }
                >
                  ♥ Save to Favourites
                </button>
                <button
                  className="w-full text-center text-xs text-gray-400 hover:text-red-600"
                  onClick={() => requireLogin() && setPanel(panel === "report" ? "" : "report")}
                >
                  Report this listing
                </button>
              </div>
            )}
          </div>

          {/* Message panel */}
          {panel === "message" && (
            <form
              className="card space-y-3 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  await api("/inquiries", { method: "POST", body: JSON.stringify({ listingId: listing.id, message }) });
                  setMessage("");
                }, "Message sent. Check your dashboard for replies.");
              }}
            >
              <label className="label">Your message</label>
              <textarea
                className="input"
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi! Is this property still available?"
              />
              <button className="btn-primary w-full" disabled={busy}>Send Message</button>
            </form>
          )}

          {/* Viewing panel */}
          {panel === "viewing" && (
            <form
              className="card space-y-3 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  await api("/viewings", {
                    method: "POST",
                    body: JSON.stringify({
                      listingId: listing.id,
                      preferredDate: new Date(viewingDate).toISOString(),
                      virtual: viewingVirtual,
                    }),
                  });
                }, "Viewing requested. The owner will confirm or propose another time.");
              }}
            >
              <label className="label">Preferred date & time</label>
              <input className="input" type="datetime-local" required value={viewingDate} onChange={(e) => setViewingDate(e.target.value)} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={viewingVirtual} onChange={(e) => setViewingVirtual(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
                Virtual viewing (video call)
              </label>
              <button className="btn-primary w-full" disabled={busy}>Request Viewing</button>
            </form>
          )}

          {/* Application panel */}
          {panel === "apply" && (
            <form
              className="card space-y-3 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  await api("/applications", {
                    method: "POST",
                    body: JSON.stringify({
                      listingId: listing.id,
                      moveInDate: new Date(appMoveIn).toISOString(),
                      occupants: appOccupants,
                      stayMonths: appStay,
                      employment: appEmployment || undefined,
                      incomeRange: appIncome || undefined,
                      message: appMessage || undefined,
                    }),
                  });
                }, "Application submitted. Track its status in your dashboard.");
              }}
            >
              <div>
                <label className="label">Move-in date</label>
                <input className="input" type="date" required value={appMoveIn} onChange={(e) => setAppMoveIn(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Occupants</label>
                  <input className="input" type="number" min={1} value={appOccupants} onChange={(e) => setAppOccupants(Number(e.target.value))} />
                </div>
                <div>
                  <label className="label">Stay (months)</label>
                  <input className="input" type="number" min={1} value={appStay} onChange={(e) => setAppStay(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="label">Employment (optional)</label>
                <input className="input" value={appEmployment} onChange={(e) => setAppEmployment(e.target.value)} placeholder="e.g. BPO agent, self-employed" />
              </div>
              <div>
                <label className="label">Monthly income range (optional)</label>
                <select className="input" value={appIncome} onChange={(e) => setAppIncome(e.target.value)}>
                  <option value="">Prefer not to say</option>
                  <option>Below ₱15,000</option>
                  <option>₱15,000 – ₱30,000</option>
                  <option>₱30,000 – ₱60,000</option>
                  <option>Above ₱60,000</option>
                </select>
              </div>
              <div>
                <label className="label">Message to owner (optional)</label>
                <textarea className="input" rows={3} value={appMessage} onChange={(e) => setAppMessage(e.target.value)} />
              </div>
              <button className="btn-primary w-full" disabled={busy}>Submit Application</button>
            </form>
          )}

          {/* Report panel */}
          {panel === "report" && (
            <form
              className="card space-y-3 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  await api("/reports", {
                    method: "POST",
                    body: JSON.stringify({ listingId: listing.id, reason: reportReason, details: reportDetails || undefined }),
                  });
                }, "Report submitted. Our team will review it.");
              }}
            >
              <label className="label">Reason</label>
              <select className="input" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                <option value="FAKE_PROPERTY">Fake property</option>
                <option value="INCORRECT_PRICE">Incorrect price</option>
                <option value="DUPLICATE_LISTING">Duplicate listing</option>
                <option value="SCAM_ATTEMPT">Scam attempt</option>
                <option value="ABUSIVE_USER">Abusive user</option>
                <option value="MISLEADING_DESCRIPTION">Misleading description</option>
                <option value="STOLEN_PHOTOS">Stolen photos</option>
                <option value="NO_LONGER_AVAILABLE">No longer available</option>
                <option value="PROHIBITED_LISTING">Illegal or prohibited</option>
              </select>
              <textarea className="input" rows={3} value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} placeholder="Details (optional)" />
              <button className="btn-primary w-full bg-red-600 hover:bg-red-700" disabled={busy}>Submit Report</button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}

function safeParse(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
