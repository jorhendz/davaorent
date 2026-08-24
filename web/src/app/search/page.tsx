"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, CATEGORIES, categoryLabel, DISTRICTS, Listing, peso } from "@/lib/api";
import ListingCard from "@/components/ListingCard";
import { Icon } from "@/components/icons";
import { clearCompare, COMPARE_EVENT, COMPARE_LIMIT, getCompareIds, toggleCompare } from "@/lib/compare";

const FLAGS = [
  ["furnished", "Furnished"],
  ["aircon", "Aircon"],
  ["parking", "Parking"],
  ["internet", "Internet"],
  ["petFriendly", "Pet-friendly"],
  ["utilitiesIncluded", "Utilities incl."],
  ["verifiedProperty", "Verified"],
] as const;

type Facets = {
  priceMin: number;
  priceMax: number;
  priceBuckets: number[];
  byCategory: { category: string; count: number }[];
};

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listings, setListings] = useState<Listing[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [district, setDistrict] = useState(searchParams.get("district") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [bedrooms, setBedrooms] = useState(searchParams.get("bedrooms") || "");
  const [priceUnit, setPriceUnit] = useState(searchParams.get("priceUnit") || "");
  const [availableOnly, setAvailableOnly] = useState(searchParams.get("availability") === "AVAILABLE");
  const [sort, setSort] = useState(searchParams.get("sort") || "featured");
  const [flags, setFlags] = useState<Record<string, boolean>>(
    Object.fromEntries(FLAGS.map(([k]) => [k, searchParams.get(k) === "true"]))
  );

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareMsg, setCompareMsg] = useState("");

  const pageSize = 12;

  useEffect(() => {
    api<Facets>("/listings/facets").then(setFacets).catch(() => {});
    setCompareIds(getCompareIds());
    const sync = () => setCompareIds(getCompareIds());
    window.addEventListener(COMPARE_EVENT, sync);
    return () => window.removeEventListener(COMPARE_EVENT, sync);
  }, []);

  const load = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      if (district) params.set("district", district);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (bedrooms) params.set("bedrooms", bedrooms);
      if (priceUnit) params.set("priceUnit", priceUnit);
      if (availableOnly) params.set("availability", "AVAILABLE");
      params.set("sort", sort);
      for (const [k, v] of Object.entries(flags)) if (v) params.set(k, "true");
      params.set("page", String(pageNum));
      params.set("pageSize", String(pageSize));
      try {
        const d = await api<{ listings: Listing[]; total: number }>(`/listings?${params.toString()}`);
        setListings(d.listings);
        setTotal(d.total);
        setPage(pageNum);
        router.replace(`/search?${params.toString()}`, { scroll: false });
      } catch {
        setListings([]);
      } finally {
        setLoading(false);
      }
    },
    [q, category, district, minPrice, maxPrice, bedrooms, priceUnit, availableOnly, sort, flags, router]
  );

  // filters apply automatically, debounced
  const firstRun = useRef(true);
  useEffect(() => {
    const delay = firstRun.current ? 0 : 350;
    firstRun.current = false;
    const t = setTimeout(() => load(1), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, district, minPrice, maxPrice, bedrooms, priceUnit, availableOnly, sort, flags]);

  function onToggleCompare(id: string) {
    const r = toggleCompare(id);
    if (r.full) {
      setCompareMsg(`You can compare up to ${COMPARE_LIMIT} listings — remove one first.`);
      setTimeout(() => setCompareMsg(""), 3000);
    }
  }

  function clearAll() {
    setQ("");
    setCategory("");
    setDistrict("");
    setMinPrice("");
    setMaxPrice("");
    setBedrooms("");
    setPriceUnit("");
    setAvailableOnly(false);
    setFlags(Object.fromEntries(FLAGS.map(([k]) => [k, false])));
  }

  const activeChips: { label: string; clear: () => void }[] = [
    ...(q ? [{ label: `“${q}”`, clear: () => setQ("") }] : []),
    ...(category ? [{ label: categoryLabel(category), clear: () => setCategory("") }] : []),
    ...(priceUnit ? [{ label: priceUnit === "DAY" ? "Per day" : "Per month", clear: () => setPriceUnit("") }] : []),
    ...(availableOnly ? [{ label: "Available now", clear: () => setAvailableOnly(false) }] : []),
    ...(district ? [{ label: `${district} District`, clear: () => setDistrict("") }] : []),
    ...(minPrice || maxPrice
      ? [{ label: `${minPrice ? peso(Number(minPrice)) : "₱0"} – ${maxPrice ? peso(Number(maxPrice)) : "any"}`, clear: () => { setMinPrice(""); setMaxPrice(""); } }]
      : []),
    ...(bedrooms ? [{ label: `${bedrooms}+ BR`, clear: () => setBedrooms("") }] : []),
    ...FLAGS.filter(([k]) => flags[k]).map(([k, label]) => ({
      label,
      clear: () => setFlags((f) => ({ ...f, [k]: false })),
    })),
  ];

  const totalPages = Math.ceil(total / pageSize);
  const countFor = (value: string) => facets?.byCategory.find((c) => c.category === value)?.count ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Browse Rentals in Davao</h1>
          <p className="text-sm text-gray-500">Spaces, vehicles, equipment & more — filters apply instantly.</p>
        </div>
        <button onClick={() => setShowFilters((s) => !s)} className="btn-secondary lg:hidden">
          <Icon name="filter" className="h-4 w-4" />
          Filters{activeChips.length > 0 ? ` (${activeChips.length})` : ""}
        </button>
      </div>

      {/* category quick-pills */}
      <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          onClick={() => setCategory("")}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
            !category ? "bg-brand-600 text-white shadow-sm" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-brand-300"
          }`}
        >
          All ({facets ? facets.byCategory.reduce((s, c) => s + c.count, 0) : "…"})
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(category === c.value ? "" : c.value)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              category === c.value
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-brand-300"
            }`}
          >
            {c.label}
            <span className={`ml-1.5 text-xs ${category === c.value ? "text-brand-100" : "text-gray-400"}`}>
              {countFor(c.value)}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-8 lg:grid-cols-[290px_1fr]">
        {/* ============ Filter by ============ */}
        <aside className={`${showFilters ? "block" : "hidden"} h-fit lg:sticky lg:top-24 lg:block`}>
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold">Filter by</p>
              {activeChips.length > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-400 transition hover:text-red-600"
                >
                  Reset all <span className="text-sm">✕</span>
                </button>
              )}
            </div>

            <FilterSection title="Rental type">
              <div className="flex gap-2">
                {[
                  ["", "Any"],
                  ["MONTH", "Per month"],
                  ["DAY", "Per day"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setPriceUnit(value)}
                    className={`rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${
                      priceUnit === value
                        ? "border-brand-600 bg-brand-50 text-brand-800"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Available now only" inline>
              <button
                role="switch"
                aria-checked={availableOnly}
                onClick={() => setAvailableOnly((v) => !v)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  availableOnly ? "bg-brand-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    availableOnly ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </FilterSection>

            <FilterSection title="Price range">
              {facets && facets.priceMax > 0 ? (
                <PriceRange
                  min={facets.priceMin}
                  max={facets.priceMax}
                  buckets={facets.priceBuckets}
                  lo={minPrice}
                  hi={maxPrice}
                  setLo={setMinPrice}
                  setHi={setMaxPrice}
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" type="number" min={0} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min ₱" />
                  <input className="input" type="number" min={0} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max ₱" />
                </div>
              )}
            </FilterSection>

            <FilterSection title="Location">
              <div className="space-y-2.5">
                <div className="relative">
                  <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Area, landmark…" />
                </div>
                <select className="input" value={district} onChange={(e) => setDistrict(e.target.value)}>
                  <option value="">Any district</option>
                  {DISTRICTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
            </FilterSection>

            <FilterSection title="Min bedrooms">
              <div className="flex gap-1.5">
                {["", "1", "2", "3", "4"].map((n) => (
                  <button
                    key={n || "any"}
                    onClick={() => setBedrooms(n)}
                    className={`flex-1 rounded-lg border py-1.5 text-sm font-semibold transition ${
                      bedrooms === n
                        ? "border-brand-600 bg-brand-50 text-brand-800"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {n ? `${n}+` : "Any"}
                  </button>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Features" last>
              <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
                {FLAGS.map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={flags[key]}
                      onChange={(e) => setFlags((f) => ({ ...f, [key]: e.target.checked }))}
                      className="h-[18px] w-[18px] rounded accent-brand-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </FilterSection>
          </div>
        </aside>

        {/* ============ Results ============ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              {loading && listings === null ? (
                "Searching…"
              ) : (
                <>
                  <span className="text-lg font-bold text-gray-900">{total}</span> rental{total === 1 ? "" : "s"} to browse
                </>
              )}
            </p>
            <select className="input w-44" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">Featured first</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>

          {activeChips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {activeChips.map((chip) => (
                <button
                  key={chip.label}
                  onClick={chip.clear}
                  className="group inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-3 pr-2 text-xs font-semibold text-brand-800 ring-1 ring-brand-100 transition hover:bg-brand-100"
                >
                  {chip.label}
                  <span className="grid h-4 w-4 place-items-center rounded-full text-brand-400 group-hover:bg-brand-200 group-hover:text-brand-800">
                    ✕
                  </span>
                </button>
              ))}
              <button onClick={clearAll} className="ml-1 text-xs font-semibold text-gray-400 hover:text-red-600">
                Clear all
              </button>
            </div>
          )}

          {compareMsg && <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">{compareMsg}</p>}

          {listings === null ? (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="card overflow-hidden p-3">
                  <div className="shimmer mb-3 h-4 w-2/3 rounded" />
                  <div className="shimmer aspect-[4/3] rounded-xl" />
                  <div className="space-y-2 pt-3">
                    <div className="shimmer h-4 w-full rounded" />
                    <div className="shimmer h-3 w-32 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="card mt-4 p-12 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gray-100 text-gray-400">
                <Icon name="search" className="h-7 w-7" />
              </span>
              <p className="mt-4 font-semibold text-gray-800">No listings match your filters</p>
              <p className="mt-1 text-sm text-gray-500">Try widening your budget or removing a filter or two.</p>
              <button onClick={clearAll} className="btn-primary mt-5">
                Clear all filters
              </button>
            </div>
          ) : (
            <div className={`mt-4 grid gap-5 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${loading ? "opacity-60" : ""}`}>
              {listings.map((l) => {
                const comparing = compareIds.includes(l.id);
                return (
                  <div key={l.id} className="relative">
                    <ListingCard listing={l} />
                    <button
                      onClick={() => onToggleCompare(l.id)}
                      className={`absolute bottom-16 right-5 z-10 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm transition ${
                        comparing ? "bg-brand-600 text-white" : "bg-white/90 text-gray-600 backdrop-blur hover:text-brand-700"
                      }`}
                      title={comparing ? "Remove from comparison" : "Add to comparison"}
                    >
                      {comparing ? "✓ Comparing" : "⇄ Compare"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => load(p)}
                  className={`h-9 w-9 rounded-lg text-sm font-medium ${
                    p === page ? "bg-brand-600 text-white" : "border border-gray-300 bg-white hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* floating compare bar */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-gray-900 py-2 pl-5 pr-2 text-sm text-white shadow-xl">
          <span>
            {compareIds.length} of {COMPARE_LIMIT} selected
          </span>
          <Link href="/compare" className="rounded-full bg-brand-500 px-4 py-1.5 font-semibold transition hover:bg-brand-600">
            Compare now →
          </Link>
          <button onClick={clearCompare} className="rounded-full px-2 py-1.5 text-gray-300 hover:text-white">
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- filter building blocks ---------- */

function FilterSection({
  title,
  children,
  inline = false,
  last = false,
}: {
  title: string;
  children: React.ReactNode;
  inline?: boolean;
  last?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`mt-5 border-t border-gray-100 pt-4 ${last ? "" : ""}`}>
      <div className={inline ? "flex items-center justify-between" : ""}>
        <button
          onClick={() => !inline && setOpen((o) => !o)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{title}</span>
          {!inline && (
            <span className={`text-gray-300 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}>▾</span>
          )}
        </button>
        {inline && children}
      </div>
      {!inline && open && <div className="mt-3">{children}</div>}
    </div>
  );
}

// Histogram + dual-handle range slider (reference-style price filter)
function PriceRange({
  min,
  max,
  buckets,
  lo,
  hi,
  setLo,
  setHi,
}: {
  min: number;
  max: number;
  buckets: number[];
  lo: string;
  hi: string;
  setLo: (v: string) => void;
  setHi: (v: string) => void;
}) {
  const loV = lo === "" ? min : Number(lo);
  const hiV = hi === "" ? max : Number(hi);
  const span = Math.max(1, max - min);
  const step = Math.max(1, Math.round(span / 100));
  const maxCount = Math.max(1, ...buckets);

  const bucketInRange = (i: number) => {
    const bLo = min + (i / buckets.length) * span;
    const bHi = min + ((i + 1) / buckets.length) * span;
    return bHi >= loV && bLo <= hiV;
  };

  return (
    <div>
      {/* histogram */}
      <div className="flex h-14 items-end gap-[3px]">
        {buckets.map((count, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-sm transition-colors duration-200 ${
              bucketInRange(i) ? "bg-brand-600" : "bg-gray-200"
            }`}
            style={{ height: `${Math.max(8, (count / maxCount) * 100)}%` }}
          />
        ))}
      </div>

      {/* dual slider */}
      <div className="dual-range mt-1">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gray-200" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand-600"
          style={{
            left: `${((loV - min) / span) * 100}%`,
            right: `${100 - ((hiV - min) / span) * 100}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.min(loV, hiV)}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), hiV);
            setLo(v <= min ? "" : String(v));
          }}
          aria-label="Minimum price"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.max(hiV, loV)}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), loV);
            setHi(v >= max ? "" : String(v));
          }}
          aria-label="Maximum price"
        />
      </div>

      {/* from / to boxes */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">From</span>
          <input
            type="number"
            className="w-full bg-transparent text-right text-sm font-bold text-gray-800 focus:outline-none"
            value={loV}
            min={min}
            max={max}
            onChange={(e) => setLo(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">To</span>
          <input
            type="number"
            className="w-full bg-transparent text-right text-sm font-bold text-gray-800 focus:outline-none"
            value={hiV}
            min={min}
            max={max}
            onChange={(e) => setHi(e.target.value)}
          />
        </div>
      </div>
      <p className="mt-1.5 text-right text-[10px] text-gray-400">
        Range across all listings: {peso(min)} – {peso(max)}
      </p>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  );
}
