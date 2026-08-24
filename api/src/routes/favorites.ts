import { Router } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          include: { photos: { orderBy: { sort: "asc" } }, owner: { select: { id: true, name: true } } },
        },
      },
    });
    res.json({ favorites });
  } catch (e) {
    next(e);
  }
});

router.post("/:listingId", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.listingId } });
    if (!listing || listing.status !== "PUBLISHED") return res.status(404).json({ error: "Listing not found" });
    const favorite = await prisma.favorite.upsert({
      where: { userId_listingId: { userId: req.user!.id, listingId: listing.id } },
      update: {},
      create: { userId: req.user!.id, listingId: listing.id },
    });
    res.status(201).json({ favorite });
  } catch (e) {
    next(e);
  }
});

router.delete("/:listingId", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    await prisma.favorite.deleteMany({ where: { userId: req.user!.id, listingId: req.params.listingId } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
