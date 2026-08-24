"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, Listing, categoryLabel, isPropertyCategory, peso, rateSuffix } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Icon } from "./icons";

const NEW_WINDOW_DAYS = 30;

export default function ListingCard({ listing }: { listing: Listing }) {
  const { user } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const cover = listing.photos?.[0]?.url;
  const property = isPropertyCategory(listing.category);
  const isNew = Date.now() - new Date(listing.createdAt).getTime() < NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  async function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push(`/login?next=/listings/${listing.id}`);
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      if (saved) {
        await api(`/favorites/${listing.id}`, { method: "DELETE" });
        setSaved(false);
      } else {
        await api(`/favorites/${listing.id}`, { method: "POST" });
        setSaved(true);
      }
    } catch {
      // ignore — card stays usable
    } finally {
      setSaving(false);
    }
  }

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="card group block overflow-hidden p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      {/* meta row: location · rating · save */}
      <div className="flex items-center gap-2 px-1 pb-2.5 pt-0.5">
        <p className="flex min-w-0 items-center gap-1 text-xs font-semibold text-gray-700">
          <Icon name="pin" className="h-3.5 w-3.5 shrink-0 text-brand-600" />
          <span className="truncate">{listing.barangay}</span>
          <span className="shrink-0 font-normal text-gray-400">({listing.district})</span>
        </p>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {listing.reviewCount ? (
            <p className="flex items-center gap-1 text-xs font-bold text-gray-800">
              <span className="text-amber-500">★</span>
              {listing.avgRating?.toFixed(1)}
              <span className="font-normal text-gray-400">({listing.reviewCount})</span>
            </p>
          ) : isNew ? (
            <span className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-100">New</span>
          ) : null}
          <button
            onClick={toggleSave}
            aria-label={saved ? "Remove from saved" : "Save to favourites"}
            className={`grid h-7 w-7 place-items-center rounded-full text-base transition ${
              saved ? "text-brand-600" : "text-gray-300 hover:text-brand-500"
            }`}
          >
            {saved ? "♥" : "♡"}
          </button>
        </div>
      </div>

      {/* photo */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-gray-300">
            <Icon name="apartment" className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          {listing.featured && <span className="badge bg-amber-400 text-amber-950 shadow-sm">⭐ Featured</span>}
          {listing.verifiedProperty && <span className="badge bg-brand-600 text-white shadow-sm">✓ Verified</span>}
        </div>
        {listing.availability !== "AVAILABLE" && (
          <span className="badge absolute right-2 top-2 bg-gray-900/80 text-white">{listing.availability}</span>
        )}
      </div>

      {/* name + spec + price */}
      <div className="px-1 pb-1 pt-3">
        <h3 className="line-clamp-1 font-bold text-gray-900 transition-colors group-hover:text-brand-700">
          {listing.title}
        </h3>
        <div className="mt-1.5 flex items-end justify-between gap-3">
          <p className="min-w-0 truncate text-xs text-gray-500">
            {categoryLabel(listing.category)}
            {property ? (
              <>
                {" · "}
                {listing.bedrooms > 0 ? `${listing.bedrooms} BR` : "Studio"} · {listing.bathrooms} Bath
                {listing.floorArea ? ` · ${listing.floorArea} sqm` : ""}
              </>
            ) : (
              <>
                {" · "}
                {listing.priceUnit === "DAY" ? "Daily rental" : "Monthly plan"}
                {listing.deposit > 0 ? ` · ${peso(listing.deposit)} deposit` : ""}
              </>
            )}
          </p>
          <p className="shrink-0 text-right text-lg font-extrabold leading-none text-gray-900">
            {peso(listing.price)}
            <span className="text-xs font-medium text-gray-400"> {rateSuffix(listing)}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
