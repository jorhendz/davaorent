import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export function signToken(user: AuthUser) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Authentication required" });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as AuthUser;
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(401).json({ error: "Account not found" });
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Not allowed" });
    next();
  };
}

// Optional auth: attaches user if a valid token is present, but never rejects.
export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET) as AuthUser;
      req.user = payload;
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}
