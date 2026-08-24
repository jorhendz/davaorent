import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth, signToken } from "../middleware/auth";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7).optional(),
  password: z.string().min(8),
  role: z.enum(["RENTER", "OWNER", "AGENCY"]).default("RENTER"),
});

router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) return res.status(409).json({ error: "Email is already registered" });
    const user = await prisma.user.create({
      data: { ...data, password: await bcrypt.hash(data.password, 10) },
    });
    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: "Invalid email or password" });
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  res.json({ user: publicUser(user!) });
});

function publicUser(u: {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  verifiedEmail: boolean;
  verifiedPhone: boolean;
  verifiedIdentity: boolean;
}) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    verifiedEmail: u.verifiedEmail,
    verifiedPhone: u.verifiedPhone,
    verifiedIdentity: u.verifiedIdentity,
  };
}

export default router;
