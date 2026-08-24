export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("davaorent_token");
}

export async function api<T = any>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  return data as T;
}

// Multipart upload — browser sets the Content-Type boundary itself.
export async function uploadPhotos(files: File[]): Promise<string[]> {
  const fd = new FormData();
  for (const f of files) fd.append("photos", f);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/api/uploads`, { method: "POST", body: fd, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Upload failed (${res.status})`, res.status);
  return data.urls as string[];
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const PROPERTY_CATEGORIES = [
  { value: "APARTMENT", label: "Apartment" },
  { value: "BOARDING_HOUSE", label: "Boarding House" },
  { value: "BEDSPACE", label: "Bedspace" },
  { value: "ROOM", label: "Room for Rent" },
  { value: "CONDO", label: "Condominium" },
  { value: "HOUSE", label: "House" },
  { value: "COMMERCIAL", label: "Commercial Space" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "OFFICE", label: "Office Space" },
];

export const OTHER_CATEGORIES = [
  { value: "CAR", label: "Car Rental" },
  { value: "MOTORCYCLE", label: "Motorcycle Rental" },
  { value: "EQUIPMENT", label: "Equipment Rental" },
  { value: "EVENT", label: "Event Rental" },
  { value: "APPLIANCE", label: "Appliance Rental" },
  { value: "VACATION", label: "Vacation Stay" },
];

export const CATEGORIES = [...PROPERTY_CATEGORIES, ...OTHER_CATEGORIES];

export function isPropertyCategory(value: string) {
  return PROPERTY_CATEGORIES.some((c) => c.value === value);
}

// Categories that use the handover/GPS Rental Tracker
export const TRACKABLE_CATEGORIES = ["CAR", "MOTORCYCLE", "EQUIPMENT", "EVENT", "APPLIANCE"];
export function isTrackableCategory(value: string) {
  return TRACKABLE_CATEGORIES.includes(value);
}

export type TrackPoint = { id: string; lat: number; lng: number; accuracy?: number | null; createdAt: string };

export type Rental = {
  id: string;
  status: string;
  startAt: string;
  dueAt: string;
  completedAt?: string | null;
  startOdometer?: number | null;
  endOdometer?: number | null;
  note?: string | null;
  applicationId?: string | null;
  listing: { id: string; title: string; category: string; photos: { url: string }[] };
  renter: { id: string; name: string; phone?: string | null };
  owner: { id: string; name: string; phone?: string | null };
  points?: TrackPoint[];
  _count?: { points: number };
};

export function isRentalOverdue(r: { status: string; dueAt: string }) {
  return r.status === "ACTIVE" && new Date(r.dueAt).getTime() < Date.now();
}

// "/ month" or "/ day" depending on the listing's rate unit
export function rateSuffix(l: { priceUnit?: string | null }) {
  return l.priceUnit === "DAY" ? "/ day" : "/ month";
}

export function rateSuffixShort(l: { priceUnit?: string | null }) {
  return l.priceUnit === "DAY" ? "/day" : "/mo";
}

export const DISTRICTS = ["Poblacion", "Talomo", "Buhangin", "Agdao", "Toril", "Bunawan", "Tugbok", "Calinan", "Baguio", "Marilog", "Paquibato"];

export function peso(n: number) {
  return `₱${n.toLocaleString("en-PH")}`;
}

export function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
}

export type Listing = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  priceUnit?: string;
  deposit: number;
  advance: number;
  district: string;
  barangay: string;
  addressFull?: string;
  landmark?: string | null;
  bedrooms: number;
  bathrooms: number;
  floorArea?: number | null;
  furnished: boolean;
  petFriendly: boolean;
  parking: boolean;
  aircon: boolean;
  internet: boolean;
  utilitiesIncluded: boolean;
  minStayMonths: number;
  availableFrom?: string | null;
  amenities: string;
  houseRules: string;
  status: string;
  availability: string;
  featured: boolean;
  featuredUntil?: string | null;
  verifiedProperty: boolean;
  publishedAt?: string | null;
  expiresAt?: string | null;
  views: number;
  adminNote?: string | null;
  createdAt: string;
  avgRating?: number | null;
  reviewCount?: number;
  photos: { id: string; url: string; isCover: boolean }[];
  owner?: { id: string; name: string; role: string; verifiedIdentity: boolean; createdAt?: string };
  reviews?: { id: string; rating: number; comment: string; createdAt: string; author: { id: string; name: string } }[];
  _count?: { reviews?: number; favorites?: number; inquiries?: number; viewings?: number; applications?: number; reports?: number };
};

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  verifiedEmail: boolean;
  verifiedPhone: boolean;
  verifiedIdentity: boolean;
};
