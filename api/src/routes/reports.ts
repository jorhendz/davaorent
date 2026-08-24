import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

const REASONS = [
  "FAKE_PROPERTY",
  "INCORRECT_PRICE",
  "DUPLICATE_LISTING",
  "SCAM_ATTEMPT",
  "ABUSIVE_USER",
  "MISLEADING_DESCRIPTION",
  "STOLEN_PHOTOS",
  "NO_LONGER_AVAILABLE",
  "PROHIBITED_LISTING",
] as const;

router.post("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({ listingId: z.string(), reason: z.enum(REASONS), details: z.string().optional() })
      .parse(req.body);
    const listing = await prisma.listing.findUnique({ where: { id: data.listingId } });
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    const report = await prisma.report.create({ data: { ...data, reporterId: req.user!.id } });
    res.status(201).json({ report });
  } catch (e) {
    next(e);
  }
});

export default router;
