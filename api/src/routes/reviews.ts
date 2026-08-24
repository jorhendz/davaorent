import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

router.post("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({ listingId: z.string(), rating: z.number().int().min(1).max(5), comment: z.string().min(5) })
      .parse(req.body);

    const listing = await prisma.listing.findUnique({ where: { id: data.listingId } });
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.ownerId === req.user!.id) return res.status(400).json({ error: "You cannot review your own listing" });

    // Reviews require a confirmed interaction: an approved application or completed viewing
    const [approvedApp, completedViewing] = await Promise.all([
      prisma.application.findFirst({
        where: { listingId: data.listingId, renterId: req.user!.id, status: "APPROVED" },
      }),
      prisma.viewingRequest.findFirst({
        where: { listingId: data.listingId, renterId: req.user!.id, status: "COMPLETED" },
      }),
    ]);
    if (!approvedApp && !completedViewing)
      return res.status(403).json({ error: "Reviews are only allowed after a completed viewing or approved application" });

    const review = await prisma.review.upsert({
      where: { listingId_authorId: { listingId: data.listingId, authorId: req.user!.id } },
      update: { rating: data.rating, comment: data.comment },
      create: { listingId: data.listingId, authorId: req.user!.id, rating: data.rating, comment: data.comment },
    });
    res.status(201).json({ review });
  } catch (e) {
    next(e);
  }
});

export default router;
