import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { notify } from "../lib/notify";
import { AuthRequest, requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

// Moderation queue
router.get("/listings", async (req, res, next) => {
  try {
    const status = String(req.query.status || "SUBMITTED");
    const listings = await prisma.listing.findMany({
      where: status === "ALL" ? {} : { status },
      orderBy: { updatedAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true, verifiedIdentity: true } },
        photos: { orderBy: { sort: "asc" } },
        _count: { select: { reports: true } },
      },
    });
    res.json({ listings });
  } catch (e) {
    next(e);
  }
});

// Approve / reject / request revision
router.patch("/listings/:id", async (req: AuthRequest, res, next) => {
  try {
    const { action, note } = z
      .object({ action: z.enum(["APPROVE", "REJECT", "NEEDS_REVISION", "ARCHIVE"]), note: z.string().optional() })
      .parse(req.body);
    const statusMap = {
      APPROVE: "PUBLISHED",
      REJECT: "REJECTED",
      NEEDS_REVISION: "NEEDS_REVISION",
      ARCHIVE: "ARCHIVED",
    } as const;
    // Approval starts (or restarts) the 30-day active window
    const expiry =
      action === "APPROVE"
        ? { publishedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
        : {};
    const listing = await prisma.listing.update({
      where: { id: req.params.id },
      data: { status: statusMap[action], ...(note !== undefined ? { adminNote: note } : {}), ...expiry },
    });

    const messages = {
      APPROVE: ["Listing approved ✅", `"${listing.title}" is now live for 30 days. Renew anytime from your dashboard.`],
      REJECT: ["Listing rejected", `"${listing.title}" was not approved.${note ? ` Reason: ${note}` : ""}`],
      NEEDS_REVISION: ["Revision requested", `"${listing.title}" needs changes before it can go live.${note ? ` Note: ${note}` : ""}`],
      ARCHIVE: ["Listing archived", `"${listing.title}" was archived by the DavaoRent team.`],
    } as const;
    const [title, body] = messages[action];
    await notify(listing.ownerId, "LISTING", title, body, "/dashboard/listings");

    res.json({ listing });
  } catch (e) {
    next(e);
  }
});

// Toggle verification badges
router.patch("/listings/:id/verify", async (req, res, next) => {
  try {
    const { verifiedProperty } = z.object({ verifiedProperty: z.boolean() }).parse(req.body);
    const listing = await prisma.listing.update({ where: { id: req.params.id }, data: { verifiedProperty } });
    res.json({ listing });
  } catch (e) {
    next(e);
  }
});

router.get("/reports", async (req, res, next) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        listing: { select: { id: true, title: true, status: true } },
        reporter: { select: { id: true, name: true, email: true } },
      },
    });
    res.json({ reports });
  } catch (e) {
    next(e);
  }
});

router.patch("/reports/:id", async (req, res, next) => {
  try {
    const { status } = z
      .object({ status: z.enum(["UNDER_REVIEW", "ACTION_TAKEN", "RESOLVED", "CLOSED"]) })
      .parse(req.body);
    const report = await prisma.report.update({ where: { id: req.params.id }, data: { status } });
    res.json({ report });
  } catch (e) {
    next(e);
  }
});

router.get("/users", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        verifiedEmail: true,
        verifiedPhone: true,
        verifiedIdentity: true,
        createdAt: true,
        _count: { select: { listings: true, reports: true } },
      },
    });
    res.json({ users });
  } catch (e) {
    next(e);
  }
});

router.patch("/users/:id/verify", async (req, res, next) => {
  try {
    const data = z
      .object({
        verifiedEmail: z.boolean().optional(),
        verifiedPhone: z.boolean().optional(),
        verifiedIdentity: z.boolean().optional(),
      })
      .parse(req.body);
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json({ user: { id: user.id, verifiedEmail: user.verifiedEmail, verifiedPhone: user.verifiedPhone, verifiedIdentity: user.verifiedIdentity } });
  } catch (e) {
    next(e);
  }
});

// Toggle featured placement (monetization control)
router.patch("/listings/:id/feature", async (req, res, next) => {
  try {
    const { featured, days } = z
      .object({ featured: z.boolean(), days: z.number().int().min(1).max(90).optional() })
      .parse(req.body);
    const listing = await prisma.listing.update({
      where: { id: req.params.id },
      data: {
        featured,
        featuredUntil: featured ? new Date(Date.now() + (days ?? 30) * 24 * 60 * 60 * 1000) : null,
      },
    });
    res.json({ listing });
  } catch (e) {
    next(e);
  }
});

router.get("/stats", async (_req, res, next) => {
  try {
    const WEEKS = 8;
    const since = new Date();
    since.setDate(since.getDate() - WEEKS * 7);

    const [
      users, renters, owners, listings, published, pendingReview, verified,
      inquiries, viewings, applications, confirmedRentals, openReports,
      byCategoryRaw, byStatusRaw, byDistrictRaw,
      recentListingDates, recentUserDates,
      recentListings, recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "RENTER" } }),
      prisma.user.count({ where: { role: { in: ["OWNER", "AGENCY"] } } }),
      prisma.listing.count(),
      prisma.listing.count({ where: { status: "PUBLISHED" } }),
      prisma.listing.count({ where: { status: "SUBMITTED" } }),
      prisma.listing.count({ where: { verifiedProperty: true } }),
      prisma.inquiry.count(),
      prisma.viewingRequest.count(),
      prisma.application.count(),
      prisma.application.count({ where: { status: "APPROVED" } }),
      prisma.report.count({ where: { status: "REPORTED" } }),
      prisma.listing.groupBy({ by: ["category"], _count: { _all: true }, where: { status: "PUBLISHED" } }),
      prisma.listing.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.listing.groupBy({ by: ["district"], _count: { _all: true }, where: { status: "PUBLISHED" } }),
      prisma.listing.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.listing.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, title: true, status: true, price: true, priceUnit: true, createdAt: true, owner: { select: { name: true } } },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
    ]);

    // Weekly buckets (oldest → newest), weeks starting Monday
    const weekStart = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
      return x;
    };
    const thisWeek = weekStart(new Date());
    const weekly: { label: string; listings: number; users: number }[] = [];
    for (let i = WEEKS - 1; i >= 0; i--) {
      const start = new Date(thisWeek);
      start.setDate(start.getDate() - i * 7);
      weekly.push({
        label: start.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
        listings: 0,
        users: 0,
      });
    }
    const bucket = (d: Date) => {
      const idx = WEEKS - 1 - Math.floor((thisWeek.getTime() - weekStart(d).getTime()) / (7 * 24 * 60 * 60 * 1000));
      return idx >= 0 && idx < WEEKS ? idx : -1;
    };
    for (const { createdAt } of recentListingDates) {
      const i = bucket(createdAt);
      if (i >= 0) weekly[i].listings++;
    }
    for (const { createdAt } of recentUserDates) {
      const i = bucket(createdAt);
      if (i >= 0) weekly[i].users++;
    }

    res.json({
      stats: {
        users, renters, owners, listings, published, pendingReview, verified,
        inquiries, viewings, applications, confirmedRentals, openReports,
        byCategory: byCategoryRaw.map((r) => ({ category: r.category, count: r._count._all })).sort((a, b) => b.count - a.count),
        byStatus: byStatusRaw.map((r) => ({ status: r.status, count: r._count._all })).sort((a, b) => b.count - a.count),
        byDistrict: byDistrictRaw.map((r) => ({ district: r.district, count: r._count._all })).sort((a, b) => b.count - a.count).slice(0, 6),
        weekly,
        recentListings,
        recentUsers,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
