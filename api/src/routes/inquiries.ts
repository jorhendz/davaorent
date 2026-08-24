import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { notify } from "../lib/notify";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

// Conversations where the user is renter or listing owner
router.get("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const inquiries = await prisma.inquiry.findMany({
      where: {
        OR: [{ renterId: req.user!.id }, { listing: { ownerId: req.user!.id } }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        listing: { select: { id: true, title: true, price: true, ownerId: true, photos: { take: 1, orderBy: { sort: "asc" } } } },
        renter: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { id: true, name: true } } } },
      },
    });
    res.json({ inquiries });
  } catch (e) {
    next(e);
  }
});

// Start (or reuse) a conversation about a listing
router.post("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { listingId, message } = z.object({ listingId: z.string(), message: z.string().min(1) }).parse(req.body);
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.status !== "PUBLISHED") return res.status(404).json({ error: "Listing not found" });
    if (listing.ownerId === req.user!.id) return res.status(400).json({ error: "You own this listing" });

    const inquiry = await prisma.inquiry.upsert({
      where: { listingId_renterId: { listingId, renterId: req.user!.id } },
      update: {},
      create: { listingId, renterId: req.user!.id },
    });
    const msg = await prisma.message.create({
      data: { inquiryId: inquiry.id, senderId: req.user!.id, body: message },
    });
    await notify(
      listing.ownerId,
      "INQUIRY",
      "New inquiry 💬",
      `${req.user!.name} asked about "${listing.title}": ${message.slice(0, 80)}`,
      "/dashboard/messages"
    );
    res.status(201).json({ inquiry, message: msg });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: req.params.id },
      include: {
        listing: { select: { id: true, title: true, price: true, ownerId: true, owner: { select: { id: true, name: true } } } },
        renter: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { id: true, name: true } } } },
      },
    });
    if (!inquiry) return res.status(404).json({ error: "Conversation not found" });
    const allowed =
      inquiry.renterId === req.user!.id || inquiry.listing.ownerId === req.user!.id || req.user!.role === "ADMIN";
    if (!allowed) return res.status(403).json({ error: "Not your conversation" });
    res.json({ inquiry });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/messages", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { body } = z.object({ body: z.string().min(1) }).parse(req.body);
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: req.params.id },
      include: { listing: { select: { ownerId: true, title: true } } },
    });
    if (!inquiry) return res.status(404).json({ error: "Conversation not found" });
    if (inquiry.renterId !== req.user!.id && inquiry.listing.ownerId !== req.user!.id)
      return res.status(403).json({ error: "Not your conversation" });
    const message = await prisma.message.create({
      data: { inquiryId: inquiry.id, senderId: req.user!.id, body },
      include: { sender: { select: { id: true, name: true } } },
    });
    const recipient = req.user!.id === inquiry.renterId ? inquiry.listing.ownerId : inquiry.renterId;
    await notify(
      recipient,
      "MESSAGE",
      "New message 💬",
      `${req.user!.name} on "${inquiry.listing.title}": ${body.slice(0, 80)}`,
      "/dashboard/messages"
    );
    res.status(201).json({ message });
  } catch (e) {
    next(e);
  }
});

export default router;
