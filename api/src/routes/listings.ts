import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthRequest, optionalAuth, requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const CATEGORIES = [
  // property rentals
  "APARTMENT",
  "BOARDING_HOUSE",
  "BEDSPACE",
  "ROOM",
  "CONDO",
  "HOUSE",
  "COMMERCIAL",
  "WAREHOUSE",
  "OFFICE",
  // all-rentals marketplace
  "CAR",
  "MOTORCYCLE",
  "EQUIPMENT",
  "EVENT",
  "APPLIANCE",
  "VACATION",
] as const;

// Public search — only PUBLISHED, non-expired listings. Address is never exposed here.
router.get("/", async (req, res, next) => {
  try {
    const q = req.query;
    const where: any = {
      status: "PUBLISHED",
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
    };

    if (q.q) {
      const term = String(q.q);
      where.AND.push({
        OR: [
          { title: { contains: term } },
          { description: { contains: term } },
          { barangay: { contains: term } },
          { district: { contains: term } },
          { landmark: { contains: term } },
        ],
      });
    }
    if (q.category && CATEGORIES.includes(q.category as any)) where.category = q.category;
    if (q.priceUnit === "MONTH" || q.priceUnit === "DAY") where.priceUnit = q.priceUnit;
    if (q.district) where.district = { contains: String(q.district) };
    if (q.barangay) where.barangay = { contains: String(q.barangay) };
    if (q.minPrice) where.price = { ...(where.price || {}), gte: Number(q.minPrice) };
    if (q.maxPrice) where.price = { ...(where.price || {}), lte: Number(q.maxPrice) };
    if (q.bedrooms) where.bedrooms = { gte: Number(q.bedrooms) };
    for (const flag of ["furnished", "petFriendly", "parking", "aircon", "internet", "utilitiesIncluded", "verifiedProperty"]) {
      if (q[flag] === "true") where[flag] = true;
    }
    if (q.availability) where.availability = String(q.availability);

    const sort = String(q.sort || "featured");
    const orderBy: any[] =
      sort === "price_asc"
        ? [{ price: "asc" }]
        : sort === "price_desc"
        ? [{ price: "desc" }]
        : sort === "newest"
        ? [{ createdAt: "desc" }]
        : [{ featured: "desc" }, { createdAt: "desc" }];

    const page = Math.max(1, Number(q.page) || 1);
    const pageSize = Math.min(50, Number(q.pageSize) || 12);

    const [total, listings] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          photos: { orderBy: { sort: "asc" } },
          owner: { select: { id: true, name: true, role: true, verifiedIdentity: true } },
          _count: { select: { reviews: true, favorites: true } },
        },
      }),
    ]);

    // attach average ratings for the returned page
    const ids = listings.map((l) => l.id);
    const ratings = ids.length
      ? await prisma.review.groupBy({
          by: ["listingId"],
          where: { listingId: { in: ids } },
          _avg: { rating: true },
          _count: { _all: true },
        })
      : [];
    const ratingMap = new Map(ratings.map((r) => [r.listingId, r]));

    res.json({
      total,
      page,
      pageSize,
      listings: listings.map((l) => ({
        ...stripAddress(l),
        avgRating: ratingMap.get(l.id)?._avg.rating ?? null,
        reviewCount: ratingMap.get(l.id)?._count._all ?? 0,
      })),
    });
  } catch (e) {
    next(e);
  }
});

// Public facets for the homepage: live counts per category and district
router.get("/facets", async (_req, res, next) => {
  try {
    const where = { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };
    const [byCategory, byDistrict, total, verified] = await Promise.all([
      prisma.listing.groupBy({ by: ["category"], _count: { _all: true }, where }),
      prisma.listing.groupBy({ by: ["district"], _count: { _all: true }, where }),
      prisma.listing.count({ where }),
      prisma.listing.count({ where: { ...where, verifiedProperty: true } }),
    ]);
    // price distribution for the histogram slider
    const priceRows = await prisma.listing.findMany({ where, select: { price: true } });
    const vals = priceRows.map((p) => p.price);
    const NB = 16;
    const priceMin = vals.length ? Math.min(...vals) : 0;
    const priceMax = vals.length ? Math.max(...vals) : 0;
    const span = Math.max(1, priceMax - priceMin);
    const priceBuckets = Array(NB).fill(0);
    for (const v of vals) {
      priceBuckets[Math.min(NB - 1, Math.floor(((v - priceMin) / span) * NB))]++;
    }

    res.json({
      total,
      verified,
      priceMin,
      priceMax,
      priceBuckets,
      byCategory: byCategory.map((r) => ({ category: r.category, count: r._count._all })).sort((a, b) => b.count - a.count),
      byDistrict: byDistrict.map((r) => ({ district: r.district, count: r._count._all })).sort((a, b) => b.count - a.count),
    });
  } catch (e) {
    next(e);
  }
});

// Compare tool: fetch up to 4 published listings by id (no view increment)
router.get("/compare", async (req, res, next) => {
  try {
    const ids = String(req.query.ids || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);
    if (ids.length === 0) return res.json({ listings: [] });
    const listings = await prisma.listing.findMany({
      where: { id: { in: ids }, status: "PUBLISHED" },
      include: {
        photos: { orderBy: { sort: "asc" }, take: 1 },
        owner: { select: { id: true, name: true, verifiedIdentity: true } },
        _count: { select: { reviews: true, favorites: true } },
      },
    });
    // preserve requested order
    const byId = new Map(listings.map((l) => [l.id, l]));
    res.json({ listings: ids.map((id) => byId.get(id)).filter(Boolean).map((l) => stripAddress(l as any)) });
  } catch (e) {
    next(e);
  }
});

// Listings owned by the current user (any status)
router.get("/mine", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { ownerId: req.user!.id },
      orderBy: { updatedAt: "desc" },
      include: {
        photos: { orderBy: { sort: "asc" } },
        _count: { select: { inquiries: true, viewings: true, applications: true, favorites: true } },
      },
    });
    res.json({ listings });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        photos: { orderBy: { sort: "asc" } },
        owner: { select: { id: true, name: true, role: true, verifiedIdentity: true, verifiedPhone: true, createdAt: true } },
        reviews: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { id: true, name: true } } },
        },
        _count: { select: { favorites: true } },
      },
    });
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    const isOwner = req.user && (req.user.id === listing.ownerId || req.user.role === "ADMIN");
    if (listing.status !== "PUBLISHED" && !isOwner) return res.status(404).json({ error: "Listing not found" });

    if (!isOwner) {
      await prisma.listing.update({ where: { id: listing.id }, data: { views: { increment: 1 } } });
    }

    res.json({ listing: isOwner ? listing : stripAddress(listing) });
  } catch (e) {
    next(e);
  }
});

const listingSchema = z.object({
  title: z.string().min(10),
  description: z.string().min(30),
  category: z.enum(CATEGORIES),
  price: z.number().int().positive(),
  priceUnit: z.enum(["MONTH", "DAY"]).default("MONTH"),
  deposit: z.number().int().min(0).default(0),
  advance: z.number().int().min(0).default(0),
  district: z.string().min(2),
  barangay: z.string().min(2),
  addressFull: z.string().min(5),
  landmark: z.string().optional(),
  bedrooms: z.number().int().min(0).default(0),
  bathrooms: z.number().int().min(0).default(1),
  floorArea: z.number().int().positive().optional(),
  furnished: z.boolean().default(false),
  petFriendly: z.boolean().default(false),
  parking: z.boolean().default(false),
  aircon: z.boolean().default(false),
  internet: z.boolean().default(false),
  utilitiesIncluded: z.boolean().default(false),
  minStayMonths: z.number().int().min(1).default(1),
  availableFrom: z.string().datetime().optional(),
  amenities: z.array(z.string()).default([]),
  houseRules: z.array(z.string()).default([]),
  photoUrls: z.array(z.string().url()).default([]),
});

router.post("/", requireAuth, requireRole("OWNER", "AGENCY", "ADMIN"), async (req: AuthRequest, res, next) => {
  try {
    const data = listingSchema.parse(req.body);
    const { photoUrls, amenities, houseRules, availableFrom, ...rest } = data;
    const listing = await prisma.listing.create({
      data: {
        ...rest,
        ownerId: req.user!.id,
        amenities: JSON.stringify(amenities),
        houseRules: JSON.stringify(houseRules),
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        status: "DRAFT",
        photos: {
          create: photoUrls.map((url, i) => ({ url, isCover: i === 0, sort: i })),
        },
      },
      include: { photos: true },
    });
    res.status(201).json({ listing });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.ownerId !== req.user!.id && req.user!.role !== "ADMIN")
      return res.status(403).json({ error: "Not your listing" });

    const data = listingSchema.partial().parse(req.body);
    const { photoUrls, amenities, houseRules, availableFrom, ...rest } = data;
    const updated = await prisma.listing.update({
      where: { id: listing.id },
      data: {
        ...rest,
        ...(amenities ? { amenities: JSON.stringify(amenities) } : {}),
        ...(houseRules ? { houseRules: JSON.stringify(houseRules) } : {}),
        ...(availableFrom ? { availableFrom: new Date(availableFrom) } : {}),
        // Any edit to a published listing goes back through review
        ...(listing.status === "PUBLISHED" ? { status: "SUBMITTED" } : {}),
      },
      include: { photos: true },
    });

    if (photoUrls) {
      await prisma.listingPhoto.deleteMany({ where: { listingId: listing.id } });
      await prisma.listingPhoto.createMany({
        data: photoUrls.map((url, i) => ({ listingId: listing.id, url, isCover: i === 0, sort: i })),
      });
    }
    res.json({ listing: updated });
  } catch (e) {
    next(e);
  }
});

// Submit a draft for admin review
router.post("/:id/submit", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.ownerId !== req.user!.id) return res.status(403).json({ error: "Not your listing" });
    if (!["DRAFT", "NEEDS_REVISION"].includes(listing.status))
      return res.status(400).json({ error: `Cannot submit a listing in ${listing.status} status` });
    const updated = await prisma.listing.update({ where: { id: listing.id }, data: { status: "SUBMITTED" } });
    res.json({ listing: updated });
  } catch (e) {
    next(e);
  }
});

// Renew a published listing for another 30 days (listing-expiration workflow)
router.post("/:id/renew", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.ownerId !== req.user!.id && req.user!.role !== "ADMIN")
      return res.status(403).json({ error: "Not your listing" });
    if (listing.status !== "PUBLISHED")
      return res.status(400).json({ error: "Only published listings can be renewed" });
    const base = listing.expiresAt && listing.expiresAt > new Date() ? listing.expiresAt : new Date();
    const expiresAt = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
    const updated = await prisma.listing.update({ where: { id: listing.id }, data: { expiresAt } });
    res.json({ listing: updated });
  } catch (e) {
    next(e);
  }
});

// Owner updates availability (Available / Reserved / Occupied / Archived)
router.post("/:id/availability", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { availability } = z
      .object({ availability: z.enum(["AVAILABLE", "RESERVED", "OCCUPIED"]) })
      .parse(req.body);
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.ownerId !== req.user!.id && req.user!.role !== "ADMIN")
      return res.status(403).json({ error: "Not your listing" });
    const updated = await prisma.listing.update({ where: { id: listing.id }, data: { availability } });
    res.json({ listing: updated });
  } catch (e) {
    next(e);
  }
});

// The exact address stays private until the owner approves a viewing.
function stripAddress<T extends { addressFull?: string }>(listing: T): Omit<T, "addressFull"> {
  const { addressFull, ...rest } = listing;
  return rest;
}

export default router;
