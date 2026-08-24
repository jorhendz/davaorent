"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, CATEGORIES, DISTRICTS, Listing, uploadPhotos } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import StatusBadge from "@/components/StatusBadge";

const FEATURES = [
  ["furnished", "Furnished"],
  ["aircon", "Air-conditioning"],
  ["internet", "Internet ready"],
  ["parking", "Parking"],
  ["petFriendly", "Pet-friendly"],
  ["utilitiesIncluded", "Utilities included"],
] as const;

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [listing, setListing] = useState<Listing | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState("");

  useEffect(() => {
    if (loading || !user) return;
    api<{ listing: Listing }>(`/listings/${id}`)
      .then((d) => {
        const l = d.listing;
        setListing(l);
        setForm({
          title: l.title,
          description: l.description,
          category: l.category,
          priceUnit: l.priceUnit || "MONTH",
          price: String(l.price),
          deposit: String(l.deposit || ""),
          advance: String(l.advance || ""),
          district: l.district,
          barangay: l.barangay,
          addressFull: l.addressFull || "",
          landmark: l.landmark || "",
          bedrooms: String(l.bedrooms),
          bathrooms: String(l.bathrooms),
          floorArea: l.floorArea ? String(l.floorArea) : "",
          minStayMonths: String(l.minStayMonths),
          availableFrom: l.availableFrom ? l.availableFrom.slice(0, 10) : "",
          amenities: safeParse(l.amenities).join("\n"),
          houseRules: safeParse(l.houseRules).join("\n"),
        });
        setFlags({
          furnished: l.furnished,
          petFriendly: l.petFriendly,
          parking: l.parking,
          aircon: l.aircon,
          internet: l.internet,
          utilitiesIncluded: l.utilitiesIncluded,
        });
        setPhotos(l.photos.map((p) => p.url));
      })
      .catch(() => setNotFound(true));
  }, [id, user, loading]);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleFiles(fileList: FileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const urls = await uploadPhotos(files);
      setPhotos((prev) => [...prev, ...urls.filter((u) => !prev.includes(u))]);
      setSaved(false);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      await api(`/listings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          priceUnit: form.priceUnit || "MONTH",
          price: Number(form.price),
          deposit: Number(form.deposit) || 0,
          advance: Number(form.advance) || 0,
          district: form.district,
          barangay: form.barangay,
          addressFull: form.addressFull,
          landmark: form.landmark || undefined,
          bedrooms: Number(form.bedrooms) || 0,
          bathrooms: Number(form.bathrooms) || 1,
          floorArea: form.floorArea ? Number(form.floorArea) : undefined,
          minStayMonths: Number(form.minStayMonths) || 1,
          availableFrom: form.availableFrom ? new Date(form.availableFrom).toISOString() : undefined,
          amenities: splitLines(form.amenities),
          houseRules: splitLines(form.houseRules),
          photoUrls: photos,
          ...flags,
        }),
      });
      setSaved(true);
      if (listing?.status === "PUBLISHED") {
        // Edits to published listings go back through review
        router.push("/dashboard/listings");
      }
    } catch (e: any) {
      setError(e.message || "Failed to save changes");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) return null;
  if (notFound)
    return <div className="card p-10 text-center text-gray-500">Listing not found, or it isn't yours to edit.</div>;
  if (!listing) return <div className="card p-10 text-center text-gray-400">Loading listing…</div>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Edit Listing</h1>
            <StatusBadge status={listing.status} />
          </div>
          <p className="text-sm text-gray-500">{listing.title}</p>
        </div>
        <Link href="/dashboard/listings" className="text-sm font-medium text-gray-500 hover:text-gray-800">
          ← Back to my properties
        </Link>
      </div>

      {listing.status === "PUBLISHED" && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This listing is live. Saving changes sends it back for a quick re-review before the updates appear publicly.
        </div>
      )}
      {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {saved && <div className="mt-4 rounded-lg bg-brand-100 px-4 py-3 text-sm text-brand-900">Changes saved.</div>}

      <div className="card mt-6 space-y-6 p-6">
        {/* Basics */}
        <section>
          <h2 className="font-semibold">Basics</h2>
          <div className="mt-3 space-y-4">
            <div>
              <label className="label">Title</label>
              <input className="input" value={form.title || ""} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows={5} value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-5">
              <div>
                <label className="label">Type</label>
                <select className="input" value={form.category} onChange={(e) => set("category", e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Rate (₱)</label>
                <input className="input" type="number" min={1} value={form.price || ""} onChange={(e) => set("price", e.target.value)} />
              </div>
              <div>
                <label className="label">Per</label>
                <select className="input" value={form.priceUnit || "MONTH"} onChange={(e) => set("priceUnit", e.target.value)}>
                  <option value="MONTH">Month</option>
                  <option value="DAY">Day</option>
                </select>
              </div>
              <div>
                <label className="label">Deposit (₱)</label>
                <input className="input" type="number" min={0} value={form.deposit || ""} onChange={(e) => set("deposit", e.target.value)} />
              </div>
              <div>
                <label className="label">Advance (₱)</label>
                <input className="input" type="number" min={0} value={form.advance || ""} onChange={(e) => set("advance", e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="border-t border-gray-100 pt-5">
          <h2 className="font-semibold">Location</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">District</label>
              <select className="input" value={form.district} onChange={(e) => set("district", e.target.value)}>
                {DISTRICTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Barangay</label>
              <input className="input" value={form.barangay || ""} onChange={(e) => set("barangay", e.target.value)} />
            </div>
            <div>
              <label className="label">Full address 🔒</label>
              <input className="input" value={form.addressFull || ""} onChange={(e) => set("addressFull", e.target.value)} />
            </div>
            <div>
              <label className="label">Landmark</label>
              <input className="input" value={form.landmark || ""} onChange={(e) => set("landmark", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Details */}
        <section className="border-t border-gray-100 pt-5">
          <h2 className="font-semibold">Details & features</h2>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div>
              <label className="label">Bedrooms</label>
              <input className="input" type="number" min={0} value={form.bedrooms || ""} onChange={(e) => set("bedrooms", e.target.value)} />
            </div>
            <div>
              <label className="label">Bathrooms</label>
              <input className="input" type="number" min={0} value={form.bathrooms || ""} onChange={(e) => set("bathrooms", e.target.value)} />
            </div>
            <div>
              <label className="label">Floor area</label>
              <input className="input" type="number" min={1} value={form.floorArea || ""} onChange={(e) => set("floorArea", e.target.value)} />
            </div>
            <div>
              <label className="label">Min. stay (mo)</label>
              <input className="input" type="number" min={1} value={form.minStayMonths || ""} onChange={(e) => set("minStayMonths", e.target.value)} />
            </div>
            <div>
              <label className="label">Available from</label>
              <input className="input" type="date" value={form.availableFrom || ""} onChange={(e) => set("availableFrom", e.target.value)} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FEATURES.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-brand-600"
                  checked={!!flags[key]}
                  onChange={(e) => {
                    setFlags((f) => ({ ...f, [key]: e.target.checked }));
                    setSaved(false);
                  }}
                />
                {label}
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Amenities (one per line)</label>
              <textarea className="input" rows={3} value={form.amenities || ""} onChange={(e) => set("amenities", e.target.value)} />
            </div>
            <div>
              <label className="label">House rules (one per line)</label>
              <textarea className="input" rows={3} value={form.houseRules || ""} onChange={(e) => set("houseRules", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Photos */}
        <section className="border-t border-gray-100 pt-5">
          <h2 className="font-semibold">Photos</h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((url, i) => (
                <div key={url} className="group relative overflow-hidden rounded-xl border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full bg-gray-100 object-cover" />
                  {i === 0 && <span className="badge absolute left-2 top-2 bg-brand-600 text-white">Cover</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                    {i !== 0 ? (
                      <button
                        type="button"
                        className="rounded bg-white/90 px-2 py-1 text-xs font-medium"
                        onClick={() => {
                          setPhotos([url, ...photos.filter((p) => p !== url)]);
                          setSaved(false);
                        }}
                      >
                        Make cover
                      </button>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      className="rounded bg-white/90 px-2 py-1 text-xs font-medium text-red-600"
                      onClick={() => {
                        setPhotos(photos.filter((p) => p !== url));
                        setSaved(false);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              {uploading ? "Uploading…" : "📷 Upload photos"}
            </button>
            <input
              className="input max-w-xs"
              value={photoInput}
              onChange={(e) => setPhotoInput(e.target.value)}
              placeholder="…or paste an image URL"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const url = photoInput.trim();
                  if (url && !photos.includes(url)) setPhotos([...photos, url]);
                  setPhotoInput("");
                  setSaved(false);
                }
              }}
            />
          </div>
        </section>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-5">
          <Link href="/dashboard/listings" className="btn-secondary">
            Cancel
          </Link>
          <button className="btn-primary" onClick={save} disabled={busy}>
            {busy ? "Saving…" : listing.status === "PUBLISHED" ? "Save & Resubmit for Review" : "Save Changes"}
          </button>
        </div>
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

function splitLines(s: string): string[] {
  return s.split("\n").map((x) => x.trim()).filter(Boolean);
}
