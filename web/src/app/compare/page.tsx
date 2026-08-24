"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, categoryLabel, Listing, peso, rateSuffixShort } from "@/lib/api";
import { COMPARE_EVENT, getCompareIds, removeCompare, clearCompare } from "@/lib/compare";

export default function ComparePage() {
  const [listings, setListings] = useState<Listing[] | null>(null);

  const load = useCallback(() => {
    const ids = getCompareIds();
    if (ids.length === 0) {
      setListings([]);
      return;
    }
    api<{ listings: Listing[] }>(`/listings/compare?ids=${ids.join(",")}`)
      .then((d) => setListings(d.listings))
      .catch(() => setListings([]));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(COMPARE_EVENT, load);
    return () => window.removeEventListener(COMPARE_EVENT, load);
  }, [load]);

  if (listings === null)
    return <div className="mx-auto max-w-6xl px-4 py-20 text-center text-gray-400">Loading comparison…</div>;

  if (listings.length === 0)
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-4xl">⇄</p>
        <h1 className="mt-3 text-2xl font-bold">Nothing to compare yet</h1>
        <p className="mt-2 text-gray-500">
          Browse rentals and tap <span className="font-medium">⇄ Compare</span> on up to four listings to see them side
          by side.
        </p>
        <Link href="/search" className="btn-primary mt-6 inline-flex">
          Browse rentals
        </Link>
      </div>
    );

  const yesNo = (v: boolean) => (v ? <span className="font-semibold text-brand-700">Yes</span> : <span className="text-gray-400">No</span>);
  const lowestPrice = Math.min(...listings.map((l) => l.price));

  const rows: { label: string; render: (l: Listing) => React.ReactNode }[] = [
    {
      label: "Rate",
      render: (l) => (
        <span className={`font-bold ${l.price === lowestPrice ? "text-brand-700" : "text-gray-800"}`}>
          {peso(l.price)}
          <span className="font-normal text-gray-500">{rateSuffixShort(l)}</span>
          {l.price === lowestPrice && listings.length > 1 && (
            <span className="ml-1.5 badge bg-brand-100 text-brand-800">Lowest</span>
          )}
        </span>
      ),
    },
    { label: "Deposit", render: (l) => (l.deposit ? peso(l.deposit) : "None") },
    { label: "Advance", render: (l) => (l.advance ? peso(l.advance) : "None") },
    { label: "Type", render: (l) => categoryLabel(l.category) },
    { label: "Location", render: (l) => `${l.barangay}, ${l.district}` },
    { label: "Bedrooms", render: (l) => (l.bedrooms === 0 ? "Studio" : l.bedrooms) },
    { label: "Bathrooms", render: (l) => l.bathrooms },
    { label: "Floor area", render: (l) => (l.floorArea ? `${l.floorArea} sqm` : "—") },
    { label: "Min. stay", render: (l) => `${l.minStayMonths} mo` },
    { label: "Furnished", render: (l) => yesNo(l.furnished) },
    { label: "Air-conditioning", render: (l) => yesNo(l.aircon) },
    { label: "Internet", render: (l) => yesNo(l.internet) },
    { label: "Parking", render: (l) => yesNo(l.parking) },
    { label: "Pet-friendly", render: (l) => yesNo(l.petFriendly) },
    { label: "Utilities included", render: (l) => yesNo(l.utilitiesIncluded) },
    {
      label: "Verified",
      render: (l) =>
        l.verifiedProperty ? <span className="badge bg-brand-600 text-white">Property Verified</span> : <span className="text-gray-400">—</span>,
    },
    {
      label: "Owner",
      render: (l) => (
        <span>
          {l.owner?.name}
          {l.owner?.verifiedIdentity && <span className="ml-1 badge bg-brand-100 text-brand-800">ID ✓</span>}
        </span>
      ),
    },
    { label: "Saves", render: (l) => l._count?.favorites ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Compare Listings</h1>
          <p className="text-sm text-gray-500">Side-by-side comparison of your shortlist.</p>
        </div>
        <button onClick={clearCompare} className="btn-secondary">
          Clear all
        </button>
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 align-top">
              <th className="w-40 px-4 py-4" />
              {listings.map((l) => (
                <th key={l.id} className="px-4 py-4 text-left font-normal">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.photos?.[0]?.url} alt="" className="aspect-[4/3] w-full rounded-lg bg-gray-100 object-cover" />
                    <button
                      onClick={() => removeCompare(l.id)}
                      className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-xs text-gray-500 shadow hover:text-red-600"
                      aria-label="Remove from comparison"
                    >
                      ✕
                    </button>
                  </div>
                  <Link href={`/listings/${l.id}`} className="mt-2 block font-semibold leading-snug hover:text-brand-700">
                    {l.title}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => (
              <tr key={row.label} className="hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-medium text-gray-500">{row.label}</td>
                {listings.map((l) => (
                  <td key={l.id} className="px-4 py-2.5">
                    {row.render(l)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="px-4 py-4" />
              {listings.map((l) => (
                <td key={l.id} className="px-4 py-4">
                  <Link href={`/listings/${l.id}`} className="btn-primary w-full">
                    View listing
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
