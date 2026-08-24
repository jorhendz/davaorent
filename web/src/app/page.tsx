"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, CATEGORIES, DISTRICTS, Listing, peso, rateSuffixShort } from "@/lib/api";
import ListingCard from "@/components/ListingCard";
import { Icon, IconName } from "@/components/icons";

const POPULAR_AREAS = [
  "Matina", "Bajada", "Lanang", "Buhangin", "Toril", "Agdao", "Poblacion",
  "Bucana", "Ma-a", "Ecoland", "Sasa", "Panacan", "Mintal", "Catalunan",
];

// Bento mosaic in the site's palette only: brand teal, amber accent, white/gray.
// Two `hero` tiles carry the color; every other tile is a clean white card.
type Tile = {
  value: string;
  label: string;
  icon: IconName;
  span: string;
  family: "space" | "other";
  hero?: boolean;
  desc?: string;
};

const TILES: Tile[] = [
  {
    value: "APARTMENT", label: "Apartments", icon: "apartment", hero: true, family: "space",
    span: "col-span-2 row-span-2",
    desc: "Davao's most-searched rentals — studios to family units.",
  },
  { value: "CONDO", label: "Condominiums", icon: "condo", span: "col-span-2", family: "space" },
  { value: "HOUSE", label: "Houses", icon: "house", span: "col-span-2", family: "space" },
  { value: "ROOM", label: "Rooms", icon: "room", span: "col-span-1", family: "space" },
  { value: "BEDSPACE", label: "Bedspaces", icon: "bedspace", span: "col-span-1", family: "space" },
  { value: "BOARDING_HOUSE", label: "Boarding Houses", icon: "boarding", span: "col-span-1", family: "space" },
  { value: "OFFICE", label: "Office Spaces", icon: "office", span: "col-span-2", family: "space" },
  { value: "COMMERCIAL", label: "Commercial Spaces", icon: "commercial", span: "col-span-2", family: "space" },
  { value: "WAREHOUSE", label: "Warehouses", icon: "warehouse", span: "col-span-1", family: "space" },
  {
    value: "CAR", label: "Car Rentals", icon: "car", hero: true, family: "other",
    span: "col-span-2 row-span-2",
    desc: "Self-drive or with driver — daily rates.",
  },
  { value: "MOTORCYCLE", label: "Motorcycles", icon: "motorcycle", span: "col-span-1", family: "other" },
  { value: "EQUIPMENT", label: "Equipment", icon: "equipment", span: "col-span-1", family: "other" },
  { value: "EVENT", label: "Event Rentals", icon: "events", span: "col-span-2", family: "other" },
  { value: "APPLIANCE", label: "Appliances", icon: "appliance", span: "col-span-2", family: "other" },
  { value: "VACATION", label: "Vacation Stays", icon: "vacation", span: "col-span-2", family: "other" },
];

const BUDGET_CHIPS = [
  { label: "Under ₱5k", max: 5000 },
  { label: "₱5k–₱10k", min: 5000, max: 10000 },
  { label: "₱10k–₱20k", min: 10000, max: 20000 },
  { label: "₱20k+", min: 20000 },
];

const ROTATING_WORDS = ["space", "apartment", "car", "condo", "venue", "office", "motorbike", "house"];

type Facets = {
  total: number;
  verified: number;
  byCategory: { category: string; count: number }[];
  byDistrict: { district: string; count: number }[];
};

type Suggestion = { label: string; kind: string; href: string };

export default function HomePage() {
  const router = useRouter();
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [recent, setRecent] = useState<Listing[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState<number | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // mouse parallax (0..1 normalized, offset from center)
  const [par, setPar] = useState({ x: 0, y: 0 });
  const onHeroMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPar({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
  }, []);

  useEffect(() => {
    api<{ listings: Listing[] }>("/listings?sort=featured&pageSize=10")
      .then((d) => setFeatured(d.listings.filter((l) => l.featured)))
      .catch(() => {});
    api<{ listings: Listing[] }>("/listings?sort=newest&pageSize=4")
      .then((d) => setRecent(d.listings))
      .catch(() => {});
    api<Facets>("/listings/facets").then(setFacets).catch(() => {});
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSuggestOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function suggestions(): Suggestion[] {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const out: Suggestion[] = [];
    for (const d of DISTRICTS) {
      if (d.toLowerCase().includes(term)) out.push({ label: `${d} District`, kind: "District", href: `/search?district=${encodeURIComponent(d)}` });
    }
    for (const a of POPULAR_AREAS) {
      if (a.toLowerCase().includes(term)) out.push({ label: a, kind: "Area", href: `/search?q=${encodeURIComponent(a)}` });
    }
    for (const c of CATEGORIES) {
      if (c.label.toLowerCase().includes(term)) out.push({ label: c.label, kind: "Property type", href: `/search?category=${c.value}` });
    }
    return out.slice(0, 6);
  }

  function search(e?: React.FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    const chip = budget !== null ? BUDGET_CHIPS[budget] : null;
    if (chip?.min) params.set("minPrice", String(chip.min));
    if (chip?.max) params.set("maxPrice", String(chip.max));
    router.push(`/search?${params.toString()}`);
  }

  const sugg = suggestions();

  return (
    <div>
      {/* ================= Hero: animated Davao skyline ================= */}
      <section
        onMouseMove={onHeroMove}
        className="animate-gradient relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-teal-500 text-white"
      >
        {/* sun */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-[8%] top-10"
          style={{ transform: `translate(${par.x * -24}px, ${par.y * -12}px)` }}
        >
          <span className="animate-sun block h-28 w-28 rounded-full bg-amber-300/70 blur-xl" />
        </div>

        {/* clouds (parallax wrapper + drift inner) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-64"
          style={{ transform: `translate(${par.x * -36}px, ${par.y * -10}px)` }}
        >
          <span className="animate-drift absolute left-[8%] top-14 h-10 w-44 rounded-full bg-white/15 blur-md" />
          <span className="animate-drift-late absolute left-[38%] top-6 h-8 w-32 rounded-full bg-white/10 blur-md" />
          <span className="animate-drift absolute right-[18%] top-24 h-12 w-56 rounded-full bg-white/10 blur-lg" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-44 pt-16 sm:pb-56 sm:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
            {facets ? `${facets.total} live listings across Davao City` : "The trusted rental marketplace for Davao"}
          </p>

          <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
            Find your next <RotatingWord words={ROTATING_WORDS} />
            <br />
            in <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">Davao City</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-brand-100">
            Davao&apos;s marketplace for every rental — homes, offices, cars, motorcycles, equipment, event packages,
            and vacation stays, all in one place.
          </p>

          {/* Search with live suggestions */}
          <div ref={searchRef} className="relative mt-8 max-w-3xl">
            <form onSubmit={search} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-2xl sm:flex-row">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">🔍</span>
                <input
                  className="input pl-9"
                  placeholder="Try “Matina”, “condo”, “near Abreeza”…"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setSuggestOpen(true);
                  }}
                  onFocus={() => setSuggestOpen(true)}
                />
              </div>
              <select className="input sm:w-48" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All property types</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button className="btn-primary sm:px-6">Search</button>
            </form>

            {suggestOpen && sugg.length > 0 && (
              <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl bg-white text-gray-800 shadow-xl ring-1 ring-black/5">
                {sugg.map((s) => (
                  <button
                    key={s.kind + s.label}
                    type="button"
                    onClick={() => router.push(s.href)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-brand-50"
                  >
                    <span className="font-medium">{s.label}</span>
                    <span className="text-xs text-gray-400">{s.kind}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-brand-100/80">Budget:</span>
              {BUDGET_CHIPS.map((b, i) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => setBudget(budget === i ? null : i)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    budget === i ? "bg-white text-brand-800" : "bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* live "just listed" ticker */}
            {recent.length > 0 && <Ticker items={recent} />}
          </div>
        </div>

        {/* Davao skyline: Mt. Apo ridge + city silhouette + white wave base */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{ transform: `translateX(${par.x * 14}px)` }}
        >
          <svg viewBox="0 0 1440 240" preserveAspectRatio="none" className="block h-40 w-[110%] -translate-x-[4%] sm:h-56">
            {/* Mt. Apo ridge */}
            <path
              d="M0 205 L140 118 L235 168 L390 74 L470 130 L555 108 L700 178 L860 132 L1000 176 L1140 142 L1280 188 L1370 165 L1440 195 L1440 240 L0 240 Z"
              fill="#0f3d38"
              opacity="0.55"
            />
            {/* city silhouette */}
            <path
              d="M0 240 L0 196 L38 196 L38 176 L54 176 L54 196 L92 196 L92 156 L100 148 L108 156 L108 196 L146 196 L146 138 L188 138 L188 196 L216 196 L216 168 L252 168 L252 110 L262 100 L272 110 L272 168 L306 168 L306 196 L342 196 L342 150 L390 150 L390 196 L420 196 L420 124 L466 124 L466 92 L474 84 L482 92 L482 196 L530 196 L530 170 L570 170 L570 196 L610 196 L610 144 L658 144 L658 196 L700 196 L700 156 L716 156 L716 132 L764 132 L764 196 L804 196 L804 172 L850 172 L850 118 L858 108 L866 118 L866 196 L910 196 L910 148 L958 148 L958 196 L1000 196 L1000 162 L1046 162 L1046 102 L1056 92 L1066 102 L1066 196 L1112 196 L1112 176 L1160 176 L1160 138 L1204 138 L1204 196 L1244 196 L1244 158 L1290 158 L1290 196 L1330 196 L1330 172 L1378 172 L1378 196 L1440 196 L1440 240 Z"
              fill="#062c28"
              opacity="0.9"
            />
            {/* lit windows */}
            <g fill="#fbbf24" opacity="0.5">
              <rect x="256" y="118" width="4" height="4" /><rect x="264" y="130" width="4" height="4" />
              <rect x="470" y="100" width="4" height="4" /><rect x="474" y="112" width="4" height="4" />
              <rect x="852" y="126" width="4" height="4" /><rect x="860" y="140" width="4" height="4" />
              <rect x="1050" y="112" width="4" height="4" /><rect x="1058" y="126" width="4" height="4" />
              <rect x="150" y="150" width="4" height="4" /><rect x="614" y="154" width="4" height="4" />
              <rect x="768" y="142" width="4" height="4" /><rect x="1208" y="148" width="4" height="4" />
            </g>
            {/* white wave base → blends into the next section */}
            <path d="M0 240 L0 218 C 240 240 480 200 720 216 C 960 232 1200 202 1440 218 L1440 240 Z" fill="#ffffff" />
          </svg>
        </div>
      </section>

      {/* ================= Animated trust strip ================= */}
      <div className="bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 text-center sm:grid-cols-4">
          <Stat value={facets?.total ?? 0} label="active listings" />
          <Stat value={facets?.verified ?? 0} label="verified properties" />
          <Stat value={facets?.byDistrict.length ?? 0} label="districts covered" />
          <div>
            <p className="text-2xl font-extrabold text-brand-700">100%</p>
            <p className="text-xs text-gray-500">free for renters</p>
          </div>
        </div>
      </div>

      {/* ================= District marquee ================= */}
      <div className="marquee-hover overflow-hidden border-y border-gray-200 bg-brand-900 py-2.5">
        <div className="animate-marquee flex w-max">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 items-center" aria-hidden={dup === 1}>
              {[...DISTRICTS, ...POPULAR_AREAS.slice(0, 5)].map((name) => (
                <Link
                  key={dup + name}
                  href={`/search?q=${encodeURIComponent(name)}`}
                  className="mx-4 flex items-center gap-2 text-sm font-medium text-brand-100/80 transition hover:text-white"
                >
                  <span className="text-amber-400">✦</span>
                  {name}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4">
        {/* ================= Category explorer (staggered) ================= */}
        <Reveal className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-600">One marketplace · every rental</p>
              <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">
                What will you rent <span className="text-brand-600">today?</span>
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-600" /> Spaces
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Vehicles & more
              </span>
            </div>
          </div>

          <div className="mt-5 grid auto-rows-[7.5rem] grid-cols-2 gap-3 [grid-auto-flow:dense] sm:grid-cols-4 lg:grid-cols-6">
            {TILES.map((t, i) => (
              <MosaicTile key={t.value} tile={t} facets={facets} delay={i * 45} />
            ))}

            {/* suggest-a-category tile */}
            <a
              href="mailto:hello@davaorent.com?subject=Category%20suggestion"
              className="reveal-child group relative col-span-2 flex flex-col justify-center overflow-hidden rounded-3xl border-2 border-dashed border-gray-300 bg-white/60 p-4 transition hover:-translate-y-1 hover:border-brand-400"
              style={{ transitionDelay: `${TILES.length * 45}ms` }}
            >
              <p className="font-bold text-gray-800">Need something else? ✨</p>
              <p className="mt-0.5 text-xs text-gray-500">New categories launch as Davao asks for them.</p>
              <p className="mt-1.5 text-xs font-semibold text-brand-600 transition group-hover:translate-x-1">
                Suggest a category →
              </p>
            </a>
          </div>
        </Reveal>

        {/* ================= Featured carousel with 3D tilt ================= */}
        {featured.length > 0 && (
          <Reveal className="mt-12">
            <div className="rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50/70 via-white to-white p-5 sm:p-7">
              <Carousel title="Featured Listings" items={featured} />
            </div>
          </Reveal>
        )}

        {/* ================= Recently added ================= */}
        <Reveal className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">Recently Added</h2>
              <p className="mt-0.5 text-sm text-gray-500">Fresh on the marketplace — be the first to inquire.</p>
            </div>
            <Link href="/search?sort=newest" className="text-sm font-medium text-brand-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recent.length > 0
              ? recent.map((l, i) => (
                  <div key={l.id} className="reveal-child" style={{ transitionDelay: `${i * 90}ms` }}>
                    <ListingCard listing={l} />
                  </div>
                ))
              : Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="card overflow-hidden">
                    <div className="shimmer aspect-[4/3]" />
                    <div className="space-y-2 p-4">
                      <div className="shimmer h-5 w-24 rounded" />
                      <div className="shimmer h-4 w-full rounded" />
                      <div className="shimmer h-3 w-32 rounded" />
                    </div>
                  </div>
                ))}
          </div>
        </Reveal>

        {/* ================= District explorer ================= */}
        <Reveal className="mt-12">
          <h2 className="text-xl font-bold">Explore Davao by district</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(facets?.byDistrict ?? DISTRICTS.map((d) => ({ district: d, count: 0 }))).map((d, i) => (
              <Link
                key={d.district}
                href={`/search?district=${encodeURIComponent(d.district)}`}
                className="reveal-child group flex items-center gap-2 rounded-full border border-gray-300 bg-white py-1.5 pl-4 pr-2 text-sm font-medium transition hover:border-brand-500 hover:text-brand-700"
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                {d.district}
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 transition group-hover:bg-brand-100 group-hover:text-brand-700">
                  {d.count}
                </span>
              </Link>
            ))}
          </div>
        </Reveal>

        {/* ================= How it works ================= */}
        <Reveal className="mt-14">
          <HowItWorks />
        </Reveal>

        {/* ================= FAQ ================= */}
        <Reveal className="mt-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr]">
            {/* intro panel */}
            <div className="h-fit lg:sticky lg:top-24">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-600">Good to know</p>
              <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">
                Questions, <span className="text-brand-600">answered</span>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                The things renters and owners ask us most — safety, addresses, payments, and pricing.
              </p>
              <div className="card mt-5 p-5">
                <p className="flex items-center gap-2 font-bold">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon name="chat" className="h-[18px] w-[18px]" />
                  </span>
                  Still curious?
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Message us anything — we reply within the day, Davao time.
                </p>
                <a href="mailto:hello@davaorent.com" className="btn-secondary mt-4 w-full">
                  Email hello@davaorent.com
                </a>
              </div>
            </div>

            {/* accordions */}
            <div className="space-y-2.5">
              {[
                ["Is DavaoRent really free for renters?", "Yes — searching, messaging owners, requesting viewings, and applying are all completely free for renters. Owners can optionally pay to feature their listings."],
                ["How do I know a listing is legit?", "Every listing is manually reviewed before it goes live. Look for the Identity Verified and Property Verified badges, message only inside DavaoRent, and always view the property before paying any deposit."],
                ["Why can't I see the exact address?", "For everyone's safety, only the barangay, district, and landmark are public. The owner shares the exact address automatically once they confirm your viewing request."],
                ["How do payments work?", "For now, rent and deposits are paid directly between you and the owner after you've viewed the property and both agreed to terms. DavaoRent never asks renters to send money through the platform."],
                ["I'm an owner — what does it cost to list?", "Listing is free. If you want more visibility, featured placements start at ₱199 for 7 days and put your property at the top of search results."],
              ].map(([question, answer], i) => (
                <details
                  key={question}
                  className="group card overflow-hidden transition-colors duration-200 open:border-brand-200 hover:border-brand-200"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3.5 px-5 py-4 [&::-webkit-details-marker]:hidden">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-xs font-extrabold text-brand-700 transition-colors duration-200 group-open:bg-brand-600 group-open:text-white">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-sm font-semibold">{question}</span>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-500 transition-transform duration-200 group-open:rotate-45 group-open:bg-brand-50 group-open:text-brand-700">
                      ＋
                    </span>
                  </summary>
                  <p className="border-t border-gray-100 bg-gray-50/60 py-4 pl-[4.4rem] pr-6 text-sm leading-relaxed text-gray-600">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ================= Owner CTA ================= */}
        <Reveal className="mt-14">
          <section className="animate-gradient relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-teal-700 p-8 text-white sm:p-12">
            <span aria-hidden className="animate-float-slow absolute -right-8 -top-8 h-48 w-48 rounded-full bg-teal-400/25 blur-2xl" />
            <span aria-hidden className="animate-float-slower absolute -bottom-10 left-1/4 h-40 w-40 rounded-full bg-amber-300/15 blur-2xl" />

            <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">For owners & agencies</p>
                <h2 className="mt-2 text-3xl font-extrabold leading-tight">
                  Have something to rent out?{" "}
                  <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
                    Turn it into income.
                  </span>
                </h2>
                <p className="mt-3 max-w-xl text-brand-100">
                  Properties, vehicles, equipment — list anything rentable and reach people searching your area.
                </p>

                <ul className="mt-5 grid gap-2.5 text-sm sm:grid-cols-2">
                  {[
                    "Free listing in about 5 minutes",
                    "Reviewed & live within 24 hours",
                    "Inquiries & bookings in one dashboard",
                    "Boost to the top from ₱199",
                  ].map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-400 text-[11px] font-bold text-amber-950">
                        ✓
                      </span>
                      <span className="text-brand-50">{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/register?role=OWNER" className="btn-primary bg-white px-6 text-brand-900 hover:bg-brand-100">
                    Start listing — it&apos;s free
                  </Link>
                  <Link href="/search" className="btn-primary bg-white/10 ring-1 ring-white/30 hover:bg-white/20">
                    Browse listings first
                  </Link>
                </div>
              </div>

              {/* floating product mock */}
              <div className="relative hidden h-80 select-none sm:block" aria-hidden>
                {/* mini listing card */}
                <div className="animate-float-slow absolute left-1/2 top-1/2 w-64 -translate-x-1/2 -translate-y-1/2 rotate-3 rounded-2xl bg-white p-3 text-gray-800 shadow-2xl">
                  <div className="relative h-28 overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-teal-400">
                    <span className="badge absolute left-2 top-2 bg-amber-400 text-amber-950">⭐ Featured</span>
                    <Icon name="apartment" className="absolute -bottom-2 -right-2 h-16 w-16 text-white/30" />
                  </div>
                  <p className="mt-2.5 text-sm font-bold leading-tight">Cozy 1BR near Matina Town Square</p>
                  <p className="mt-0.5 text-sm font-bold text-brand-700">
                    ₱12,000 <span className="text-xs font-normal text-gray-400">/ month</span>
                  </p>
                  <div className="mt-1.5 flex gap-3 text-[10px] font-medium text-gray-500">
                    <span>👁 128 views</span>
                    <span>💬 9 inquiries</span>
                    <span>❤️ 12 saves</span>
                  </div>
                </div>

                {/* inquiry toast */}
                <div className="animate-float-slower absolute -top-1 right-0 w-56 -rotate-3 rounded-xl bg-white p-3 text-gray-800 shadow-xl">
                  <p className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-100 text-[10px]">💬</span>
                    New inquiry
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-gray-500">
                    &ldquo;Hello po! Is this still available? Pwede po ba mag-viewing this Saturday?&rdquo;
                  </p>
                </div>

                {/* stats chip */}
                <div className="animate-float-slow absolute bottom-3 left-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold ring-1 ring-white/25 backdrop-blur">
                  📈 +3 applications this week
                </div>
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}

/* ---------- interactive building blocks ---------- */

function MosaicTile({ tile, facets, delay }: { tile: Tile; facets: Facets | null; delay: number }) {
  const count = facets?.byCategory.find((f) => f.category === tile.value)?.count ?? 0;
  const amber = tile.family === "other";

  if (tile.hero) {
    return (
      <Link
        href={`/search?category=${tile.value}`}
        className={`reveal-child group relative overflow-hidden rounded-3xl p-5 text-white shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${tile.span} ${
          amber
            ? "bg-gradient-to-br from-amber-400 to-amber-600"
            : "bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500"
        }`}
        style={{ transitionDelay: `${delay}ms` }}
      >
        <Icon
          name={tile.icon}
          className="absolute -bottom-5 -right-5 h-28 w-28 -rotate-12 text-white/20 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-110"
        />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent to-white/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="absolute right-4 top-4 -translate-x-1 text-xl opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
          →
        </span>
        <div className="relative flex h-full flex-col">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
            <Icon name={tile.icon} className="h-5 w-5 text-white" />
          </span>
          <div className="mt-auto">
            <p className="text-2xl font-extrabold leading-tight">{tile.label}</p>
            {tile.desc && <p className="mt-1 max-w-[16rem] text-xs font-medium text-white/85">{tile.desc}</p>}
            <span className="mt-2 inline-flex w-fit items-center rounded-full bg-white/25 px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-white/20">
              {count > 0 ? `${count} listing${count === 1 ? "" : "s"}` : "✦ Be the first to list"}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/search?category=${tile.value}`}
      className={`reveal-child group relative overflow-hidden rounded-3xl border bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${tile.span} ${
        amber ? "border-gray-200 hover:border-amber-400" : "border-gray-200 hover:border-brand-500"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* faint watermark icon */}
      <Icon
        name={tile.icon}
        className="absolute -bottom-5 -right-5 h-24 w-24 -rotate-12 text-gray-900/[0.05] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-110 sm:h-28 sm:w-28"
      />
      {/* slide-in arrow */}
      <span
        className={`absolute right-4 top-4 -translate-x-1 text-lg opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 ${
          amber ? "text-amber-500" : "text-brand-600"
        }`}
      >
        →
      </span>

      <div className="relative flex h-full flex-col">
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl transition-colors duration-300 ${
            amber
              ? "bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white"
              : "bg-brand-50 text-brand-700 group-hover:bg-brand-600 group-hover:text-white"
          }`}
        >
          <Icon name={tile.icon} className="h-5 w-5" />
        </span>
        <div className="mt-auto">
          <p className="text-base font-bold leading-tight text-gray-900">{tile.label}</p>
          <span
            className={`mt-1.5 inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              count > 0 ? "bg-gray-100 text-gray-600" : amber ? "bg-amber-50 text-amber-700" : "bg-brand-50 text-brand-700"
            }`}
          >
            {count > 0 ? `${count} listing${count === 1 ? "" : "s"}` : "✦ Be the first to list"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function RotatingWord({ words }: { words: string[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % words.length), 2400);
    return () => clearInterval(t);
  }, [words.length]);
  return (
    <span className="relative inline-block overflow-hidden align-bottom">
      <span key={idx} className="word-in inline-block border-b-4 border-amber-400 text-amber-300">
        {words[idx]}
      </span>
    </span>
  );
}

function Ticker({ items }: { items: Listing[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 3600);
    return () => clearInterval(t);
  }, [items.length]);
  const l = items[idx];
  if (!l) return null;
  return (
    <Link
      href={`/listings/${l.id}`}
      className="mt-4 inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full bg-white/10 py-1.5 pl-3 pr-4 text-xs ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
    >
      <span className="badge shrink-0 bg-amber-400 text-amber-950">Just listed</span>
      <span key={l.id} className="word-in truncate text-brand-50">
        {l.title} — {peso(l.price)}{rateSuffixShort(l)}
      </span>
    </Link>
  );
}

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("revealed");
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current && value > 0) {
        started.current = true;
        const duration = 900;
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  useEffect(() => {
    if (started.current) setDisplay(value);
  }, [value]);

  return (
    <div ref={ref}>
      <p className="text-2xl font-extrabold text-brand-700 tabular-nums">{display}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

// 3D tilt-on-hover wrapper
function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${px * 8}deg) rotateX(${py * -8}deg) translateY(-4px)`;
  }
  function onLeave() {
    const el = ref.current;
    if (el) el.style.transform = "perspective(700px) rotateY(0deg) rotateX(0deg) translateY(0)";
  }

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className="transition-transform duration-200 will-change-transform">
      {children}
    </div>
  );
}

function Carousel({ title, items }: { title: string; items: Listing[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  function update() {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }

  function scrollBy(dir: 1 | -1) {
    trackRef.current?.scrollBy({ left: dir * trackRef.current.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold">{title}</h2>
            <span className="badge bg-amber-400 text-amber-950 shadow-sm">⭐ Promoted</span>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">Owners boost these to the top — your listing could be here from ₱199.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scrollBy(-1)}
            disabled={!canPrev}
            className="grid h-10 w-10 place-items-center rounded-full border border-amber-200 bg-white text-gray-600 shadow-sm transition hover:bg-amber-50 hover:text-gray-900 disabled:opacity-30"
            aria-label="Previous"
          >
            ←
          </button>
          <button
            onClick={() => scrollBy(1)}
            disabled={!canNext}
            className="grid h-10 w-10 place-items-center rounded-full border border-amber-200 bg-white text-gray-600 shadow-sm transition hover:bg-amber-50 hover:text-gray-900 disabled:opacity-30"
            aria-label="Next"
          >
            →
          </button>
        </div>
      </div>
      <div
        ref={trackRef}
        onScroll={update}
        className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 pt-1"
      >
        {items.map((l) => (
          <div key={l.id} className="w-72 shrink-0 snap-start">
            <TiltCard>
              <ListingCard listing={l} />
            </TiltCard>
          </div>
        ))}
      </div>
    </div>
  );
}

function HowItWorks() {
  const [tab, setTab] = useState<"renter" | "owner">("renter");
  const renter = tab === "renter";

  const steps: [IconName, string, string][] = renter
    ? [
        ["search", "Search & compare", "Filter by district, budget, and type. Save favourites and compare up to 4 side by side."],
        ["chat", "Contact & view", "Message owners inside DavaoRent and book an in-person or virtual viewing."],
        ["key", "Apply & move in", "Submit your application, get approved, agree on terms — then move into your new space."],
      ]
    : [
        ["pencil", "Create your listing", "A guided 5-minute form — photos, pricing, house rules. Your exact address stays private."],
        ["shield", "Get verified & published", "Our team reviews every listing within 24 hours. Verified badges build renter trust."],
        ["key", "Choose your tenant", "Manage inquiries, viewings, and applications in one dashboard. Approve the best fit."],
      ];

  return (
    <div>
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-600">Simple by design</p>
        <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">How it works</h2>
      </div>

      {/* role toggle */}
      <div className="mx-auto mt-5 flex w-fit rounded-full bg-gray-100 p-1">
        {(["renter", "owner"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              tab === t
                ? t === "renter"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-amber-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {t === "renter" ? "I'm renting" : "I'm an owner"}
          </button>
        ))}
      </div>

      {/* journey timeline */}
      <div className="relative mt-10">
        {/* dashed path connecting the steps */}
        <div
          aria-hidden
          className={`absolute left-[18%] right-[18%] top-8 hidden border-t-2 border-dashed sm:block ${
            renter ? "border-brand-200" : "border-amber-200"
          }`}
        />
        <div key={tab} className="word-in grid gap-10 sm:grid-cols-3 sm:gap-6">
          {steps.map(([icon, title, body], i) => (
            <div key={title} className="group relative text-center">
              <div
                className={`relative mx-auto grid h-16 w-16 place-items-center rounded-2xl text-white shadow-lg ring-4 transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:rotate-3 ${
                  renter ? "bg-brand-600 ring-brand-100 shadow-brand-600/25" : "bg-amber-500 ring-amber-100 shadow-amber-500/25"
                }`}
              >
                <Icon name={icon} className="h-7 w-7" />
                <span
                  className={`absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-extrabold shadow ring-1 ring-black/5 ${
                    renter ? "text-brand-700" : "text-amber-600"
                  }`}
                >
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-bold">{title}</h3>
              <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-gray-600">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          {renter ? (
            <Link href="/search" className="btn-primary px-6">
              Start browsing rentals →
            </Link>
          ) : (
            <Link href="/register?role=OWNER" className="btn-primary bg-amber-500 px-6 hover:bg-amber-600">
              List your first rental →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
