import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { notify } from "../lib/notify";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

// Categories where handover/GPS tracking applies
export const TRACKABLE_CATEGORIES = ["CAR", "MOTORCYCLE", "EQUIPMENT", "EVENT", "APPLIANCE"];

// Rentals the user is involved in (as owner or renter)
router.get("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const rentals = await prisma.rentalTracking.findMany({
      where: { OR: [{ ownerId: req.user!.id }, { renterId: req.user!.id }] },
      orderBy: { createdAt: "desc" },
      include: {
        listing: { select: { id: true, title: true, category: true, photos: { take: 1, orderBy: { sort: "asc" } } } },
        renter: { select: { id: true, name: true, phone: true } },
        owner: { select: { id: true, name: true, phone: true } },
        points: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { points: true } },
      },
    });
    res.json({ rentals });
  } catch (e) {
    next(e);
  }
});

// Owner starts a tracked rental from an approved application (or directly from a listing)
router.post("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        applicationId: z.string().optional(),
        listingId: z.string().optional(),
        renterId: z.string().optional(),
        dueAt: z.string().datetime(),
        startOdometer: z.number().int().min(0).optional(),
        note: z.string().optional(),
      })
      .parse(req.body);

    let listingId = data.listingId;
    let renterId = data.renterId;

    if (data.applicationId) {
      const application = await prisma.application.findUnique({
        where: { id: data.applicationId },
        include: { listing: { select: { id: true, ownerId: true, category: true } } },
      });
      if (!application) return res.status(404).json({ error: "Application not found" });
      if (application.listing.ownerId !== req.user!.id) return res.status(403).json({ error: "Not your listing" });
      if (application.status !== "APPROVED")
        return res.status(400).json({ error: "Start tracking from an approved application" });
      listingId = application.listing.id;
      renterId = application.renterId;
    }

    if (!listingId || !renterId)
      return res.status(400).json({ error: "Provide applicationId, or listingId + renterId" });

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.ownerId !== req.user!.id) return res.status(403).json({ error: "Not your listing" });
    if (!TRACKABLE_CATEGORIES.includes(listing.category))
      return res.status(400).json({ error: "Tracking is for vehicle and equipment rentals" });

    const existing = await prisma.rentalTracking.findFirst({
      where: { listingId, renterId, status: "ACTIVE" },
    });
    if (existing) return res.status(409).json({ error: "An active rental already exists for this listing and renter" });

    const rental = await prisma.rentalTracking.create({
      data: {
        listingId,
        renterId,
        ownerId: req.user!.id,
        applicationId: data.applicationId,
        dueAt: new Date(data.dueAt),
        startOdometer: data.startOdometer,
        note: data.note,
      },
    });

    await prisma.listing.update({ where: { id: listingId }, data: { availability: "OCCUPIED" } });
    await notify(
      renterId,
      "RENTAL",
      "Rental started 🚗",
      `"${listing.title}" is checked out to you until ${new Date(data.dueAt).toLocaleString("en-PH")}. You can share your trip location with the owner from your dashboard.`,
      "/dashboard/rentals"
    );

    res.status(201).json({ rental });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const rental = await prisma.rentalTracking.findUnique({
      where: { id: req.params.id },
      include: {
        listing: { select: { id: true, title: true, category: true, photos: { take: 1, orderBy: { sort: "asc" } } } },
        renter: { select: { id: true, name: true, phone: true } },
        owner: { select: { id: true, name: true, phone: true } },
        points: { orderBy: { createdAt: "desc" }, take: 60 },
      },
    });
    if (!rental) return res.status(404).json({ error: "Rental not found" });
    if (rental.ownerId !== req.user!.id && rental.renterId !== req.user!.id && req.user!.role !== "ADMIN")
      return res.status(403).json({ error: "Not your rental" });
    res.json({ rental });
  } catch (e) {
    next(e);
  }
});

// Owner completes or cancels; either party can extend the note
router.patch("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        status: z.enum(["COMPLETED", "CANCELLED"]).optional(),
        endOdometer: z.number().int().min(0).optional(),
        dueAt: z.string().datetime().optional(),
        note: z.string().optional(),
      })
      .parse(req.body);

    const rental = await prisma.rentalTracking.findUnique({
      where: { id: req.params.id },
      include: { listing: { select: { id: true, title: true } } },
    });
    if (!rental) return res.status(404).json({ error: "Rental not found" });
    if (rental.ownerId !== req.user!.id) return res.status(403).json({ error: "Only the owner can update a rental" });
    if (rental.status !== "ACTIVE" && data.status) return res.status(400).json({ error: "Rental is already closed" });

    const updated = await prisma.rentalTracking.update({
      where: { id: rental.id },
      data: {
        ...(data.status ? { status: data.status, completedAt: new Date() } : {}),
        ...(data.endOdometer !== undefined ? { endOdometer: data.endOdometer } : {}),
        ...(data.dueAt ? { dueAt: new Date(data.dueAt) } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
    });

    if (data.status) {
      await prisma.listing.update({ where: { id: rental.listing.id }, data: { availability: "AVAILABLE" } });
      await notify(
        rental.renterId,
        "RENTAL",
        data.status === "COMPLETED" ? "Rental completed ✅" : "Rental cancelled",
        `"${rental.listing.title}" has been marked ${data.status.toLowerCase()} by the owner. Thanks for renting on DavaoRent!`,
        "/dashboard/rentals"
      );
    }

    res.json({ rental: updated });
  } catch (e) {
    next(e);
  }
});

// Renter shares a GPS ping while the rental is active
router.post("/:id/location", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        accuracy: z.number().min(0).optional(),
      })
      .parse(req.body);

    const rental = await prisma.rentalTracking.findUnique({ where: { id: req.params.id } });
    if (!rental) return res.status(404).json({ error: "Rental not found" });
    if (rental.renterId !== req.user!.id)
      return res.status(403).json({ error: "Only the renter can share their location" });
    if (rental.status !== "ACTIVE") return res.status(400).json({ error: "Rental is not active" });

    const point = await prisma.trackPoint.create({ data: { rentalId: rental.id, ...data } });
    res.status(201).json({ point });
  } catch (e) {
    next(e);
  }
});

export default router;
