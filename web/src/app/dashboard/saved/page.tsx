"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, peso, rateSuffix } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function SavedRentalsPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[] | null>(null);

  useEffect(() => {
    if (user) load();
  }, [user]);

  function load() {
    api<{ favorites: any[] }>("/favorites").then((d) => setFavorites(d.favorites)).catch(() => setFavorites([]));
  }

  async function remove(listingId: string) {
    await api(`/favorites/${listingId}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Saved Rentals</h1>
      <p className="text-sm text-gray-500">Your shortlist of properties to revisit and compare.</p>

      {favorites === null ? (
        <div className="card mt-6 p-10 text-center text-gray-400">Loading…</div>
      ) : favorites.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-gray-500">
          <p className="text-3xl">❤️</p>
          <p className="mt-2">No saved rentals yet.</p>
          <Link href="/search" className="btn-primary mt-4 inline-flex">
            Browse rentals
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((f) => (
            <div key={f.id} className="card group overflow-hidden">
              <Link href={`/listings/${f.listing.id}`} className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.listing.photos?.[0]?.url} alt="" className="aspect-[4/3] w-full bg-gray-100 object-cover transition group-hover:scale-[1.02]" />
              </Link>
              <div className="p-4">
                <p className="font-bold text-brand-700">
                  {peso(f.listing.price)} <span className="text-xs font-normal text-gray-500">{rateSuffix(f.listing)}</span>
                </p>
                <Link href={`/listings/${f.listing.id}`} className="mt-0.5 block truncate font-semibold hover:text-brand-700">
                  {f.listing.title}
                </Link>
                <p className="text-xs text-gray-500">{f.listing.barangay}</p>
                <div className="mt-3 flex justify-between text-sm">
                  <Link href={`/listings/${f.listing.id}`} className="font-medium text-brand-600 hover:underline">
                    View →
                  </Link>
                  <button onClick={() => remove(f.listing.id)} className="text-xs text-gray-400 hover:text-red-600">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
