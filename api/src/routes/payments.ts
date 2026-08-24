import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { notify } from "../lib/notify";
import { AuthRequest, requireAuth, requireRole } from "../middleware/auth";

const router = Router();

export const FEATURED_PLANS = {
  FEATURED_7: { days: 7, amount: 199, label: "7-day Featured" },
  FEATURED_15: { days: 15, amount: 349, label: "15-day Featured" },
  FEATURED_30: { days: 30, amount: 599, label: "30-day Featured" },
} as const;

router.get("/plans", (_req, res) => {
  res.json({
    plans: Object.entries(FEATURED_PLANS).map(([product, p]) => ({ product, ...p })),
  });
});

// Sandbox checkout: records the payment and activates the promotion immediately.
// Swap the body of this handler for a real GCash/Maya/gateway flow later —
// the Payment record and activation logic stay the same.
router.post("/checkout", requireAuth, requireRole("OWNER", "AGENCY", "ADMIN"), async (req: AuthRequest, res, next) => {
  try {
    const { listingId, product } = z
      .object({ listingId: z.string(), product: z.enum(["FEATURED_7", "FEATURED_15", "FEATURED_30"]) })
      .parse(req.body);

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.ownerId !== req.user!.id && req.user!.role !== "ADMIN")
      return res.status(403).json({ error: "Not your listing" });
    if (listing.status !== "PUBLISHED")
      return res.status(400).json({ error: "Only published listings can be promoted" });

    const plan = FEATURED_PLANS[product];
    const base = listing.featured && listing.featuredUntil && listing.featuredUntil > new Date()
      ? listing.featuredUntil
      : new Date();
    const featuredUntil = new Date(base.getTime() + plan.days * 24 * 60 * 60 * 1000);

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          userId: req.user!.id,
          listingId,
          product,
          description: `${plan.label} — ${listing.title}`,
          amount: plan.amount,
          status: "PAID",
          method: "SANDBOX",
          reference: `SBX-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
        },
      }),
      prisma.listing.update({ where: { id: listingId }, data: { featured: true, featuredUntil } }),
    ]);

    await notify(
      req.user!.id,
      "PAYMENT",
      "Promotion activated 🎉",
      `${plan.label} is now active for "${listing.title}" until ${featuredUntil.toLocaleDateString("en-PH")}. Receipt: ${payment.reference}.`,
      "/dashboard/promotions"
    );

    res.status(201).json({ payment, featuredUntil });
  } catch (e) {
    next(e);
  }
});

router.get("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: { listing: { select: { id: true, title: true, featured: true, featuredUntil: true } } },
    });
    res.json({ payments });
  } catch (e) {
    next(e);
  }
});

export default router;
