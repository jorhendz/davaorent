import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { notify } from "../lib/notify";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const viewings = await prisma.viewingRequest.findMany({
      where: { OR: [{ renterId: req.user!.id }, { listing: { ownerId: req.user!.id } }] },
      orderBy: { preferredDate: "asc" },
      include: {
        listing: { select: { id: true, title: true, barangay: true, district: true, ownerId: true, addressFull: true } },
        renter: { select: { id: true, name: true, phone: true } },
      },
    });
    // Exact address is revealed only after the owner confirms the viewing
    const sanitized = viewings.map((v) => {
      const isOwner = v.listing.ownerId === req.user!.id;
      if (!isOwner && v.status !== "CONFIRMED") {
        const { addressFull, ...listing } = v.listing;
        return { ...v, listing };
      }
      return v;
    });
    res.json({ viewings: sanitized });
  } catch (e) {
    next(e);
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        listingId: z.string(),
        preferredDate: z.string().datetime(),
        virtual: z.boolean().default(false),
        visitors: z.number().int().min(1).max(10).default(1),
        note: z.string().optional(),
      })
      .parse(req.body);
    const listing = await prisma.listing.findUnique({ where: { id: data.listingId } });
    if (!listing || listing.status !== "PUBLISHED") return res.status(404).json({ error: "Listing not found" });
    if (listing.ownerId === req.user!.id) return res.status(400).json({ error: "You own this listing" });

    const viewing = await prisma.viewingRequest.create({
      data: {
        listingId: data.listingId,
        renterId: req.user!.id,
        preferredDate: new Date(data.preferredDate),
        virtual: data.virtual,
        visitors: data.visitors,
        note: data.note,
      },
    });
    await notify(
      listing.ownerId,
      "VIEWING",
      "New viewing request 📅",
      `${req.user!.name} wants to view "${listing.title}" on ${new Date(data.preferredDate).toLocaleString("en-PH")}.`,
      "/dashboard/viewings"
    );
    res.status(201).json({ viewing });
  } catch (e) {
    next(e);
  }
});

const TRANSITIONS: Record<string, { allowed: string[]; by: "owner" | "renter" | "both" }> = {
  CONFIRMED: { allowed: ["REQUESTED", "RESCHEDULED"], by: "owner" },
  DECLINED: { allowed: ["REQUESTED", "RESCHEDULED"], by: "owner" },
  RESCHEDULED: { allowed: ["REQUESTED", "CONFIRMED"], by: "both" },
  COMPLETED: { allowed: ["CONFIRMED"], by: "owner" },
  CANCELLED: { allowed: ["REQUESTED", "CONFIRMED", "RESCHEDULED"], by: "both" },
  NO_SHOW: { allowed: ["CONFIRMED"], by: "owner" },
};

router.patch("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { status, preferredDate } = z
      .object({
        status: z.enum(["CONFIRMED", "DECLINED", "RESCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
        preferredDate: z.string().datetime().optional(),
      })
      .parse(req.body);

    const viewing = await prisma.viewingRequest.findUnique({
      where: { id: req.params.id },
      include: { listing: { select: { ownerId: true, title: true } } },
    });
    if (!viewing) return res.status(404).json({ error: "Viewing not found" });

    const isOwner = viewing.listing.ownerId === req.user!.id;
    const isRenter = viewing.renterId === req.user!.id;
    if (!isOwner && !isRenter) return res.status(403).json({ error: "Not allowed" });

    const rule = TRANSITIONS[status];
    if (!rule.allowed.includes(viewing.status))
      return res.status(400).json({ error: `Cannot move from ${viewing.status} to ${status}` });
    if (rule.by === "owner" && !isOwner) return res.status(403).json({ error: "Only the owner can do that" });

    const updated = await prisma.viewingRequest.update({
      where: { id: viewing.id },
      data: { status, ...(preferredDate ? { preferredDate: new Date(preferredDate) } : {}) },
    });

    const counterpart = isOwner ? viewing.renterId : viewing.listing.ownerId;
    const statusText: Record<string, string> = {
      CONFIRMED: "was confirmed ✅ — the exact address is now visible to the renter",
      DECLINED: "was declined",
      RESCHEDULED: "was proposed for a new schedule",
      COMPLETED: "was marked completed",
      CANCELLED: "was cancelled",
      NO_SHOW: "was marked as a no-show",
    };
    await notify(
      counterpart,
      "VIEWING",
      "Viewing update 📅",
      `Your viewing for "${viewing.listing.title}" ${statusText[status] || `is now ${status}`}.`,
      "/dashboard/viewings"
    );

    res.json({ viewing: updated });
  } catch (e) {
    next(e);
  }
});

export default router;
