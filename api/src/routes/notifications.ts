import { Router } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({ where: { userId: req.user!.id, read: false } }),
    ]);
    res.json({ notifications, unread });
  } catch (e) {
    next(e);
  }
});

router.post("/read-all", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/read", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
