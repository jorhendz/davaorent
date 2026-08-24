import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { notify } from "../lib/notify";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const applications = await prisma.application.findMany({
      where: { OR: [{ renterId: req.user!.id }, { listing: { ownerId: req.user!.id } }] },
      orderBy: { createdAt: "desc" },
      include: {
        listing: { select: { id: true, title: true, price: true, ownerId: true } },
        renter: { select: { id: true, name: true, phone: true, email: true, verifiedIdentity: true } },
      },
    });
    res.json({ applications });
  } catch (e) {
    next(e);
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        listingId: z.string(),
        moveInDate: z.string().datetime(),
        occupants: z.number().int().min(1).default(1),
        stayMonths: z.number().int().min(1).default(6),
        employment: z.string().optional(),
        incomeRange: z.string().optional(),
        pets: z.string().optional(),
        message: z.string().optional(),
      })
      .parse(req.body);

    const listing = await prisma.listing.findUnique({ where: { id: data.listingId } });
    if (!listing || listing.status !== "PUBLISHED") return res.status(404).json({ error: "Listing not found" });
    if (listing.ownerId === req.user!.id) return res.status(400).json({ error: "You own this listing" });

    const existing = await prisma.application.findFirst({
      where: { listingId: data.listingId, renterId: req.user!.id, status: { notIn: ["WITHDRAWN", "DECLINED"] } },
    });
    if (existing) return res.status(409).json({ error: "You already have an active application for this listing" });

    const application = await prisma.application.create({
      data: { ...data, renterId: req.user!.id, moveInDate: new Date(data.moveInDate) },
    });
    await notify(
      listing.ownerId,
      "APPLICATION",
      "New rental application 📄",
      `${req.user!.name} applied for "${listing.title}" (move-in ${new Date(data.moveInDate).toLocaleDateString("en-PH")}).`,
      "/dashboard/applications"
    );
    res.status(201).json({ application });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { status, ownerNote } = z
      .object({
        status: z.enum(["UNDER_REVIEW", "INFO_NEEDED", "APPROVED", "DECLINED", "WITHDRAWN"]),
        ownerNote: z.string().optional(),
      })
      .parse(req.body);

    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { listing: { select: { id: true, ownerId: true, title: true } } },
    });
    if (!application) return res.status(404).json({ error: "Application not found" });

    const isOwner = application.listing.ownerId === req.user!.id;
    const isRenter = application.renterId === req.user!.id;

    if (status === "WITHDRAWN") {
      if (!isRenter) return res.status(403).json({ error: "Only the applicant can withdraw" });
    } else if (!isOwner) {
      return res.status(403).json({ error: "Only the owner can update application status" });
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status, ...(ownerNote !== undefined ? { ownerNote } : {}) },
    });

    // Approving an application reserves the property
    if (status === "APPROVED") {
      await prisma.listing.update({ where: { id: application.listing.id }, data: { availability: "RESERVED" } });
    }

    if (status === "WITHDRAWN") {
      await notify(
        application.listing.ownerId,
        "APPLICATION",
        "Application withdrawn",
        `${req.user!.name} withdrew their application for "${application.listing.title}".`,
        "/dashboard/applications"
      );
    } else {
      const statusText: Record<string, string> = {
        APPROVED: "was approved 🎉 — the owner will send the rental terms",
        DECLINED: "was declined",
        UNDER_REVIEW: "is now under review",
        INFO_NEEDED: "needs more information",
      };
      await notify(
        application.renterId,
        "APPLICATION",
        "Application update 📄",
        `Your application for "${application.listing.title}" ${statusText[status] || `is now ${status}`}.${ownerNote ? ` Note: ${ownerNote}` : ""}`,
        "/dashboard/applications"
      );
    }

    res.json({ application: updated });
  } catch (e) {
    next(e);
  }
});

export default router;
