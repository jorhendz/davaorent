"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, Listing, peso } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Plan = { product: string; days: number; amount: number; label: string };

export default function PromotionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [listingId, setListingId] = useState("");
  const [product, setProduct] = useState("FEATURED_30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!loading && user && !["OWNER", "AGENCY", "ADMIN"].includes(user.role)) router.push("/dashboard");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    api<{ plans: Plan[] }>("/payments/plans").then((d) => setPlans(d.plans)).catch(() => {});
    refresh();
  }, [user]);

  function refresh() {
    api<{ listings: Listing[] }>("/listings/mine")
      .then((d) => {
        const pub = d.listings.filter((l) => l.status === "PUBLISHED");
        setListings(pub);
        setListingId((prev) => prev || pub[0]?.id || "");
      })
      .catch(() => {});
    api<{ payments: any[] }>("/payments").then((d) => setPayments(d.payments)).catch(() => {});
  }

  async function checkout() {
    if (!listingId) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const d = await api<{ payment: any; featuredUntil: string }>("/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ listingId, product }),
      });
      setSuccess(
        `Payment confirmed (${d.payment.reference}). Your listing is featured until ${new Date(d.featuredUntil).toLocaleDateString("en-PH")}.`
      );
      refresh();
    } catch (e: any) {
      setError(e.message || "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) return null;

  const selected = listings.find((l) => l.id === listingId);
  const plan = plans.find((p) => p.product === product);

  return (
    <div>
      <h1 className="text-2xl font-bold">Promotions & Billing</h1>
      <p className="text-sm text-gray-500">
        Featured listings appear at the top of search results with a Featured badge and homepage exposure.
      </p>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mt-4 rounded-lg bg-brand-100 px-4 py-3 text-sm text-brand-900">🎉 {success}</div>}

      {listings.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-gray-500">
          <p>You need a published listing before you can promote one.</p>
          <Link href="/dashboard/listings/new" className="btn-primary mt-4 inline-flex">
            + Add a listing
          </Link>
        </div>
      ) : (
        <div className="card mt-6 p-6">
          <h2 className="font-semibold">Promote a listing</h2>

          <div className="mt-4">
            <label className="label">Listing</label>
            <select className="input max-w-md" value={listingId} onChange={(e) => setListingId(e.target.value)}>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
            {selected?.featured && selected.featuredUntil && (
              <p className="mt-1 text-xs text-amber-700">
                Already featured until {new Date(selected.featuredUntil).toLocaleDateString("en-PH")} — buying again
                extends it.
              </p>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {plans.map((p) => (
              <button
                key={p.product}
                onClick={() => setProduct(p.product)}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  product === p.product ? "border-brand-600 bg-brand-50" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{p.days} days</p>
                  {p.product === "FEATURED_30" && <span className="badge bg-amber-100 text-amber-800">Best value</span>}
                </div>
                <p className="mt-1 text-2xl font-bold text-brand-700">{peso(p.amount)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {peso(Math.round(p.amount / p.days))}/day · top placement + badge
                </p>
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-4">
            <div className="text-sm text-gray-600">
              <p>
                <span className="font-semibold text-gray-900">{plan?.label}</span> for{" "}
                <span className="font-semibold text-gray-900">{selected?.title || "…"}</span>
              </p>
              <p className="text-xs text-gray-400">
                Sandbox checkout — GCash / Maya / card payments plug in here at launch.
              </p>
            </div>
            <button className="btn-primary" disabled={busy || !listingId} onClick={checkout}>
              {busy ? "Processing…" : `Pay ${plan ? peso(plan.amount) : ""} & Activate`}
            </button>
          </div>
        </div>
      )}

      {/* Payment history */}
      <div className="card mt-6 overflow-x-auto">
        <h2 className="px-5 pt-5 font-semibold">Payment history</h2>
        {payments.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">No payments yet.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5">Date</th>
                <th className="px-3 py-2.5">Description</th>
                <th className="px-3 py-2.5">Reference</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-5 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 text-gray-500">{new Date(p.createdAt).toLocaleDateString("en-PH")}</td>
                  <td className="px-3 py-3">{p.description}</td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-500">{p.reference}</td>
                  <td className="px-3 py-3">
                    <span className="badge bg-brand-100 text-brand-800">{p.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">{peso(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
