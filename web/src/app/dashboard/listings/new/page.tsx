"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, DISTRICTS, isPropertyCategory, peso, uploadPhotos } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Icon, IconName } from "@/components/icons";

const STEPS = ["Basics", "Location", "Details", "Photos & Review"] as const;

const CATEGORY_CARDS: { value: string; label: string; icon: IconName; hint: string }[] = [
  { value: "APARTMENT", label: "Apartment", icon: "apartment", hint: "Unit in a building or compound" },
  { value: "CONDO", label: "Condominium", icon: "condo", hint: "Condo unit with amenities" },
  { value: "HOUSE", label: "House", icon: "house", hint: "Whole house for rent" },
  { value: "ROOM", label: "Room", icon: "room", hint: "Private room in a home" },
  { value: "BEDSPACE", label: "Bedspace", icon: "bedspace", hint: "Shared room, per-bed rate" },
  { value: "BOARDING_HOUSE", label: "Boarding House", icon: "boarding", hint: "Room in a boarding house" },
  { value: "COMMERCIAL", label: "Commercial", icon: "commercial", hint: "Retail or business space" },
  { value: "OFFICE", label: "Office", icon: "office", hint: "Office space" },
  { value: "WAREHOUSE", label: "Warehouse", icon: "warehouse", hint: "Storage or industrial" },
  { value: "CAR", label: "Car", icon: "car", hint: "Self-drive or with driver" },
  { value: "MOTORCYCLE", label: "Motorcycle", icon: "motorcycle", hint: "Scooters & motorbikes" },
  { value: "EQUIPMENT", label: "Equipment", icon: "equipment", hint: "Tools & machinery" },
  { value: "EVENT", label: "Event Rental", icon: "events", hint: "Sound, lights, tents, venues" },
  { value: "APPLIANCE", label: "Appliance", icon: "appliance", hint: "Home appliances" },
  { value: "VACATION", label: "Vacation Stay", icon: "vacation", hint: "Short stays & staycations" },
];

const FEATURES: { key: "furnished" | "aircon" | "internet" | "parking" | "petFriendly" | "utilitiesIncluded"; label: string; icon: IconName }[] = [
  { key: "furnished", label: "Furnished", icon: "sofa" },
  { key: "aircon", label: "Air-conditioning", icon: "snowflake" },
  { key: "internet", label: "Internet ready", icon: "wifi" },
  { key: "parking", label: "Parking", icon: "car" },
  { key: "petFriendly", label: "Pet-friendly", icon: "paw" },
  { key: "utilitiesIncluded", label: "Utilities included", icon: "bolt" },
];

const AMENITY_SUGGESTIONS = ["CCTV", "Gated compound", "Own meter", "Own kitchen", "Balcony", "Elevator", "24/7 security", "Laundry area", "Water included"];
const RULE_SUGGESTIONS = ["No smoking indoors", "No pets", "Curfew 11 PM", "Max 2 occupants", "No subletting", "Visitors until 9 PM only"];
const OTHER_AMENITY_SUGGESTIONS = ["Delivery available", "Insurance included", "Helmet included", "With-driver option", "Free setup", "Safety gear included", "Operator available"];
const OTHER_RULE_SUGGESTIONS = ["Valid government ID required", "Valid driver's license required", "Damage fees apply", "50% down payment to reserve", "Return in same condition"];

type Flags = Record<(typeof FEATURES)[number]["key"], boolean>;

export default function NewListingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [busy, setBusy] = useState<false | "draft" | "submit">(false);

  const [priceUnit, setPriceUnit] = useState<"MONTH" | "DAY">("MONTH");
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "APARTMENT",
    price: "",
    deposit: "",
    advance: "",
    district: DISTRICTS[0],
    barangay: "",
    addressFull: "",
    landmark: "",
    bedrooms: "1",
    bathrooms: "1",
    floorArea: "",
    minStayMonths: "1",
    availableFrom: "",
  });
  const [flags, setFlags] = useState<Flags>({
    furnished: false,
    petFriendly: false,
    parking: false,
    aircon: false,
    internet: false,
    utilitiesIncluded: false,
  });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [houseRules, setHouseRules] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [amenityInput, setAmenityInput] = useState("");
  const [ruleInput, setRuleInput] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/dashboard/listings/new");
    if (!loading && user && !["OWNER", "AGENCY", "ADMIN"].includes(user.role)) router.push("/dashboard");
  }, [loading, user, router]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function validateStep(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (form.title.trim().length < 10) e.title = "Give your listing a descriptive title (at least 10 characters).";
      if (form.description.trim().length < 30) e.description = "Describe the property in at least 30 characters — renters read this first.";
      if (!form.price || Number(form.price) < 1) e.price = "Enter the monthly rent.";
    }
    if (s === 1) {
      if (form.barangay.trim().length < 2) e.barangay = "Enter the barangay.";
      if (form.addressFull.trim().length < 5) e.addressFull = "Enter the full address — it stays private.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function addChip(value: string, list: string[], setList: (v: string[]) => void, clear?: () => void) {
    const v = value.trim();
    if (v && !list.includes(v)) setList([...list, v]);
    clear?.();
  }

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      setErrors((e) => ({ ...e, photo: "Please choose image files (JPG, PNG, WebP, or GIF)." }));
      return;
    }
    setUploading(true);
    setErrors((e) => ({ ...e, photo: "" }));
    try {
      const urls = await uploadPhotos(files);
      setPhotos((prev) => [...prev, ...urls.filter((u) => !prev.includes(u))]);
    } catch (err: any) {
      setErrors((e) => ({ ...e, photo: err.message || "Upload failed. Please try again." }));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function addPhoto() {
    const url = photoInput.trim();
    if (!url) return;
    try {
      new URL(url);
    } catch {
      setErrors((e) => ({ ...e, photo: "That doesn't look like a valid URL." }));
      return;
    }
    if (!photos.includes(url)) setPhotos([...photos, url]);
    setPhotoInput("");
    setErrors((e) => ({ ...e, photo: "" }));
  }

  const isProperty = isPropertyCategory(form.category);

  const payload = useMemo(
    () => ({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      price: Number(form.price) || 0,
      priceUnit,
      deposit: Number(form.deposit) || 0,
      advance: Number(form.advance) || 0,
      district: form.district,
      barangay: form.barangay.trim(),
      addressFull: form.addressFull.trim(),
      landmark: form.landmark.trim() || undefined,
      bedrooms: isProperty ? Number(form.bedrooms) || 0 : 0,
      bathrooms: isProperty ? Number(form.bathrooms) || 1 : 0,
      floorArea: isProperty && form.floorArea ? Number(form.floorArea) : undefined,
      minStayMonths: Number(form.minStayMonths) || 1,
      availableFrom: form.availableFrom ? new Date(form.availableFrom).toISOString() : undefined,
      amenities,
      houseRules,
      photoUrls: photos,
      ...flags,
    }),
    [form, flags, amenities, houseRules, photos, priceUnit, isProperty]
  );

  async function save(mode: "draft" | "submit") {
    if (!validateStep(0) || !validateStep(1)) {
      setStep(!validateStep(0) ? 0 : 1);
      return;
    }
    setBusy(mode);
    setSubmitError("");
    try {
      const d = await api<{ listing: { id: string } }>("/listings", { method: "POST", body: JSON.stringify(payload) });
      if (mode === "submit") await api(`/listings/${d.listing.id}/submit`, { method: "POST" });
      router.push("/dashboard/listings");
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  if (loading || !user) return <div className="py-20 text-center text-gray-400">Loading…</div>;

  const selectedCategory = CATEGORY_CARDS.find((c) => c.value === form.category);

  return (
    <div>
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">List your property</h1>
            <p className="mt-1 text-sm text-gray-500">
              A complete, honest listing gets up to 3× more inquiries. It takes about 5 minutes.
            </p>
          </div>
          <Link href="/dashboard/listings" className="text-sm font-medium text-gray-500 hover:text-gray-800">
            ← Back to my properties
          </Link>
        </div>

        {/* Stepper */}
        <ol className="mt-8 flex items-center gap-0">
          {STEPS.map((label, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li key={label} className="flex flex-1 items-center last:flex-none">
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-2.5 ${i < step ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold transition ${
                      done
                        ? "bg-brand-600 text-white"
                        : current
                        ? "bg-brand-600 text-white ring-4 ring-brand-100"
                        : "border-2 border-gray-300 bg-white text-gray-400"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className={`hidden text-sm font-semibold sm:block ${current ? "text-gray-900" : done ? "text-brand-700" : "text-gray-400"}`}>
                    {label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <span className={`mx-3 h-0.5 flex-1 rounded ${i < step ? "bg-brand-500" : "bg-gray-200"}`} />
                )}
              </li>
            );
          })}
        </ol>

        {submitError && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* ============ Main panel ============ */}
          <div className="card overflow-hidden">
            {/* ---------- Step 1: Basics ---------- */}
            {step === 0 && (
              <div className="p-6 sm:p-8">
                <h2 className="text-lg font-bold">What are you listing?</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {CATEGORY_CARDS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        set("category", c.value);
                        setPriceUnit(isPropertyCategory(c.value) ? "MONTH" : "DAY");
                      }}
                      className={`rounded-xl border-2 p-3.5 text-left transition ${
                        form.category === c.value
                          ? "border-brand-600 bg-brand-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`grid h-10 w-10 place-items-center rounded-xl transition ${
                          form.category === c.value ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"
                        }`}
                      >
                        <Icon name={c.icon} className="h-[22px] w-[22px]" />
                      </span>
                      <p className="mt-2 text-sm font-semibold">{c.label}</p>
                      <p className="mt-0.5 text-xs leading-snug text-gray-500">{c.hint}</p>
                    </button>
                  ))}
                </div>

                <div className="mt-8">
                  <label className="label">Listing title</label>
                  <input
                    className={`input ${errors.title ? "border-red-400" : ""}`}
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    maxLength={90}
                    placeholder="e.g. Sunny 1BR Apartment near Matina Town Square"
                  />
                  <div className="mt-1 flex justify-between text-xs">
                    <span className="text-red-600">{errors.title}</span>
                    <span className="text-gray-400">{form.title.length}/90</span>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="label">Description</label>
                  <textarea
                    className={`input ${errors.description ? "border-red-400" : ""}`}
                    rows={6}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder={"Describe the space, the neighbourhood, what's included in the rent, and who it's ideal for.\n\nExample: Fully furnished 1-bedroom on the 2nd floor of a quiet, gated compound. 5-minute walk to Matina Town Square. Water included; own electric meter."}
                  />
                  {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
                </div>

                <div className="mt-6">
                  <label className="label">Rate type</label>
                  <div className="flex w-fit rounded-lg bg-gray-100 p-1">
                    {(["MONTH", "DAY"] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setPriceUnit(u)}
                        className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
                          priceUnit === u ? "bg-white text-brand-800 shadow-sm" : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        {u === "MONTH" ? "Per month" : "Per day"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <PesoInput
                    label={priceUnit === "DAY" ? "Daily rate" : "Monthly rent"}
                    required
                    value={form.price}
                    error={errors.price}
                    onChange={(v) => set("price", v)}
                  />
                  <PesoInput label="Security deposit" value={form.deposit} onChange={(v) => set("deposit", v)} />
                  <PesoInput label="Advance payment" value={form.advance} onChange={(v) => set("advance", v)} />
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  {isProperty
                    ? "Common in Davao: one month deposit + one month advance. Listings with clear terms get fewer back-and-forth questions."
                    : "A refundable security deposit protects your item — state clearly what it covers."}
                </p>
              </div>
            )}

            {/* ---------- Step 2: Location ---------- */}
            {step === 1 && (
              <div className="p-6 sm:p-8">
                <h2 className="text-lg font-bold">{isProperty ? "Where is the property?" : "Where is it located?"}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Renters only see the barangay, district, and landmark. The exact {isProperty ? "address" : "pickup address"} is
                  revealed to a renter only after you confirm their {isProperty ? "viewing" : "booking"} request.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
                    <input
                      className={`input ${errors.barangay ? "border-red-400" : ""}`}
                      value={form.barangay}
                      onChange={(e) => set("barangay", e.target.value)}
                      placeholder="e.g. Matina Crossing"
                    />
                    {errors.barangay && <p className="mt-1 text-xs text-red-600">{errors.barangay}</p>}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="label">
                    {isProperty ? "Full address" : "Business / pickup address"}{" "}
                    <span className="badge ml-1 bg-gray-100 text-gray-600">🔒 kept private</span>
                  </label>
                  <input
                    className={`input ${errors.addressFull ? "border-red-400" : ""}`}
                    value={form.addressFull}
                    onChange={(e) => set("addressFull", e.target.value)}
                    placeholder="House no., street, subdivision…"
                  />
                  {errors.addressFull && <p className="mt-1 text-xs text-red-600">{errors.addressFull}</p>}
                </div>

                <div className="mt-4">
                  <label className="label">Nearby landmark (optional, shown publicly)</label>
                  <input
                    className="input"
                    value={form.landmark}
                    onChange={(e) => set("landmark", e.target.value)}
                    placeholder="e.g. Near Abreeza Mall / beside a 7-Eleven"
                  />
                  <p className="mt-1 text-xs text-gray-400">A good landmark helps renters judge commute times instantly.</p>
                </div>
              </div>
            )}

            {/* ---------- Step 3: Details ---------- */}
            {step === 2 && (
              <div className="p-6 sm:p-8">
                <h2 className="text-lg font-bold">{isProperty ? "Property details" : "Rental details"}</h2>

                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {isProperty && (
                    <>
                      <div>
                        <label className="label">Bedrooms</label>
                        <input className="input" type="number" min={0} value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} />
                        <p className="mt-1 text-xs text-gray-400">0 = studio</p>
                      </div>
                      <div>
                        <label className="label">Bathrooms</label>
                        <input className="input" type="number" min={0} value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Floor area (sqm)</label>
                        <input className="input" type="number" min={1} value={form.floorArea} onChange={(e) => set("floorArea", e.target.value)} placeholder="—" />
                      </div>
                      <div>
                        <label className="label">Min. stay (months)</label>
                        <input className="input" type="number" min={1} value={form.minStayMonths} onChange={(e) => set("minStayMonths", e.target.value)} />
                      </div>
                    </>
                  )}
                  <div className={isProperty ? "" : "col-span-2"}>
                    <label className="label">Available from</label>
                    <input className="input" type="date" value={form.availableFrom} onChange={(e) => set("availableFrom", e.target.value)} />
                  </div>
                </div>

                {isProperty && (
                  <>
                    <h3 className="mt-8 font-semibold">Features</h3>
                    <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {FEATURES.map((f) => (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setFlags((prev) => ({ ...prev, [f.key]: !prev[f.key] }))}
                          className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition ${
                            flags[f.key]
                              ? "border-brand-600 bg-brand-50 text-brand-800"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          <Icon name={f.icon} className={`h-5 w-5 ${flags[f.key] ? "text-brand-600" : "text-gray-400"}`} />
                          {f.label}
                          {flags[f.key] && <span className="ml-auto text-brand-600">✓</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <ChipEditor
                  title={isProperty ? "Amenities" : "Inclusions & extras"}
                  hint={isProperty ? "Add anything that makes the place stand out." : "What's included with the rental?"}
                  chips={amenities}
                  setChips={setAmenities}
                  input={amenityInput}
                  setInput={setAmenityInput}
                  suggestions={isProperty ? AMENITY_SUGGESTIONS : OTHER_AMENITY_SUGGESTIONS}
                  placeholder={isProperty ? "Type an amenity and press Enter" : "Type an inclusion and press Enter"}
                  addChip={addChip}
                />
                <ChipEditor
                  title={isProperty ? "House rules" : "Rules & requirements"}
                  hint="Clear rules up front prevent problems later."
                  chips={houseRules}
                  setChips={setHouseRules}
                  input={ruleInput}
                  setInput={setRuleInput}
                  suggestions={isProperty ? RULE_SUGGESTIONS : OTHER_RULE_SUGGESTIONS}
                  placeholder="Type a rule and press Enter"
                  addChip={addChip}
                />
              </div>
            )}

            {/* ---------- Step 4: Photos & Review ---------- */}
            {step === 3 && (
              <div className="p-6 sm:p-8">
                <h2 className="text-lg font-bold">Photos</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Listings with 3+ photos get far more inquiries. The first photo is your cover.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleFiles(e.dataTransfer.files);
                  }}
                  disabled={uploading}
                  className={`mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
                    dragOver
                      ? "border-brand-500 bg-brand-50"
                      : "border-gray-300 bg-gray-50/50 hover:border-brand-400 hover:bg-brand-50/40"
                  } ${uploading ? "cursor-wait opacity-60" : "cursor-pointer"}`}
                >
                  <span className="text-3xl">{uploading ? "⏳" : "📷"}</span>
                  <span className="text-sm font-semibold text-gray-700">
                    {uploading ? "Uploading photos…" : "Drag & drop photos here, or click to browse"}
                  </span>
                  <span className="text-xs text-gray-400">JPG, PNG, WebP, or GIF · up to 8MB each · up to 10 photos</span>
                </button>
                {errors.photo && <p className="mt-2 text-xs text-red-600">{errors.photo}</p>}

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-medium text-gray-400 hover:text-gray-600">
                    Or add a photo by URL
                  </summary>
                  <div className="mt-2 flex gap-2">
                    <input
                      className="input"
                      value={photoInput}
                      onChange={(e) => setPhotoInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPhoto())}
                      placeholder="https://…"
                    />
                    <button type="button" className="btn-secondary shrink-0" onClick={addPhoto}>
                      Add
                    </button>
                  </div>
                </details>

                {photos.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                              onClick={() => setPhotos([url, ...photos.filter((p) => p !== url)])}
                            >
                              Make cover
                            </button>
                          ) : (
                            <span />
                          )}
                          <button
                            type="button"
                            className="rounded bg-white/90 px-2 py-1 text-xs font-medium text-red-600"
                            onClick={() => setPhotos(photos.filter((p) => p !== url))}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Review summary */}
                <h2 className="mt-10 text-lg font-bold">Review your listing</h2>
                <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                  <dl className="divide-y divide-gray-100 text-sm">
                    <ReviewRow label="Property" value={`${selectedCategory?.label} — ${form.title || "—"}`} onEdit={() => setStep(0)} />
                    <ReviewRow
                      label="Pricing"
                      value={`${form.price ? peso(Number(form.price)) : "—"}/${priceUnit === "DAY" ? "day" : "mo"} · Deposit ${form.deposit ? peso(Number(form.deposit)) : "none"} · Advance ${form.advance ? peso(Number(form.advance)) : "none"}`}
                      onEdit={() => setStep(0)}
                    />
                    <ReviewRow
                      label="Location"
                      value={`${form.barangay || "—"}, ${form.district} District${form.landmark ? ` · ${form.landmark}` : ""}`}
                      onEdit={() => setStep(1)}
                    />
                    <ReviewRow
                      label="Details"
                      value={
                        isProperty
                          ? `${Number(form.bedrooms) || "Studio"} BR · ${form.bathrooms} bath${form.floorArea ? ` · ${form.floorArea} sqm` : ""} · min. ${form.minStayMonths} mo`
                          : `${selectedCategory?.label} rental · rate per ${priceUnit === "DAY" ? "day" : "month"}`
                      }
                      onEdit={() => setStep(2)}
                    />
                    <ReviewRow
                      label="Features"
                      value={
                        [...FEATURES.filter((f) => flags[f.key]).map((f) => f.label), ...amenities].join(", ") || "None added"
                      }
                      onEdit={() => setStep(2)}
                    />
                    <ReviewRow label="House rules" value={houseRules.join(" · ") || "None added"} onEdit={() => setStep(2)} />
                    <ReviewRow label="Photos" value={`${photos.length} photo${photos.length === 1 ? "" : "s"}`} onEdit={() => {}} />
                  </dl>
                </div>

                <div className="mt-6 rounded-xl bg-brand-50 p-4 text-sm text-brand-900">
                  <p className="font-semibold">What happens next?</p>
                  <p className="mt-1">
                    Our team reviews every listing before it goes live — usually within 24 hours. You'll see the status
                    on your dashboard, and we'll flag anything that needs a revision.
                  </p>
                </div>
              </div>
            )}

            {/* Footer nav */}
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-6 py-4 sm:px-8">
              {step > 0 ? (
                <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)} disabled={!!busy}>
                  ← Back
                </button>
              ) : (
                <span />
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" className="btn-primary" onClick={next}>
                  Continue →
                </button>
              ) : (
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary" onClick={() => save("draft")} disabled={!!busy}>
                    {busy === "draft" ? "Saving…" : "Save as Draft"}
                  </button>
                  <button type="button" className="btn-primary" onClick={() => save("submit")} disabled={!!busy}>
                    {busy === "submit" ? "Submitting…" : "Submit for Review"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ============ Live preview sidebar ============ */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <div className="card overflow-hidden">
                <div className="relative aspect-[4/3] bg-gray-100">
                  {photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photos[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-brand-200">
                      {selectedCategory && <Icon name={selectedCategory.icon} className="h-14 w-14" />}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-lg font-bold text-brand-700">
                    {form.price ? peso(Number(form.price)) : "₱ —"}
                    <span className="text-sm font-normal text-gray-500"> {priceUnit === "DAY" ? "/ day" : "/ month"}</span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold">{form.title || "Your listing title"}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {form.barangay || "Barangay"}, {form.district} District
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="badge bg-gray-100 text-gray-700">{selectedCategory?.label}</span>
                    {FEATURES.filter((f) => flags[f.key])
                      .slice(0, 3)
                      .map((f) => (
                        <span key={f.key} className="badge bg-brand-50 text-brand-700">
                          {f.label}
                        </span>
                      ))}
                  </div>
                </div>
                <p className="border-t border-gray-100 px-4 py-2 text-center text-xs text-gray-400">
                  Live preview — how renters will see your card
                </p>
              </div>

              <div className="card p-4 text-sm">
                <p className="font-semibold">💡 Tips from top landlords</p>
                <ul className="mt-2 space-y-1.5 text-gray-600">
                  <li>• Shoot photos in daylight, landscape orientation.</li>
                  <li>• Mention what's included: water, WiFi, association dues.</li>
                  <li>• Name a landmark renters actually know.</li>
                  <li>• Reply fast — response time is shown on your profile.</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
    </div>
  );
}

function PesoInput({
  label,
  value,
  onChange,
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label">
        {label} {!required && <span className="font-normal text-gray-400">(optional)</span>}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">₱</span>
        <input
          className={`input pl-7 ${error ? "border-red-400" : ""}`}
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
        />
      </div>
      {value && Number(value) > 0 && <p className="mt-1 text-xs text-gray-400">{peso(Number(value))}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ChipEditor({
  title,
  hint,
  chips,
  setChips,
  input,
  setInput,
  suggestions,
  placeholder,
  addChip,
}: {
  title: string;
  hint: string;
  chips: string[];
  setChips: (v: string[]) => void;
  input: string;
  setInput: (v: string) => void;
  suggestions: string[];
  placeholder: string;
  addChip: (value: string, list: string[], setList: (v: string[]) => void, clear?: () => void) => void;
}) {
  return (
    <div className="mt-8">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-0.5 text-xs text-gray-400">{hint}</p>
      <div className="mt-3 flex gap-2">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addChip(input, chips, setChips, () => setInput("")))}
          placeholder={placeholder}
        />
        <button type="button" className="btn-secondary shrink-0" onClick={() => addChip(input, chips, setChips, () => setInput(""))}>
          Add
        </button>
      </div>
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span key={c} className="badge gap-1.5 bg-brand-50 py-1 pl-3 pr-1.5 text-brand-800 ring-1 ring-brand-100">
              {c}
              <button
                type="button"
                onClick={() => setChips(chips.filter((x) => x !== c))}
                className="grid h-4 w-4 place-items-center rounded-full text-brand-400 hover:bg-brand-100 hover:text-brand-700"
                aria-label={`Remove ${c}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {suggestions
          .filter((s) => !chips.includes(s))
          .map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addChip(s, chips, setChips)}
              className="rounded-full border border-dashed border-gray-300 px-2.5 py-0.5 text-xs text-gray-500 hover:border-brand-400 hover:text-brand-700"
            >
              + {s}
            </button>
          ))}
      </div>
    </div>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="w-28 shrink-0 font-medium text-gray-500">{label}</dt>
      <dd className="flex-1 text-gray-800">{value}</dd>
      <button type="button" onClick={onEdit} className="text-xs font-medium text-brand-600 hover:underline">
        Edit
      </button>
    </div>
  );
}
