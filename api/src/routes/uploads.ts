import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

// Storage strategy: Vercel Blob when a token is configured (serverless-safe),
// local disk otherwise (dev / traditional hosts).
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");
if (!useBlob) {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch {
    // read-only filesystem (serverless without blob token) — uploads will 501 below
  }
}

const ALLOWED = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

const filename = (mimetype: string) =>
  `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ALLOWED.get(mimetype) || ".jpg"}`;

const upload = multer({
  storage: useBlob
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => cb(null, filename(file.mimetype)),
      }),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, WebP, or GIF images are allowed"));
  },
});

// POST /api/uploads — multipart form field name: "photos" (up to 10 images, 8MB each)
router.post("/", requireAuth, (req: AuthRequest, res) => {
  upload.array("photos", 10)(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || "Upload failed" });
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) return res.status(400).json({ error: "No images received" });

    try {
      if (useBlob) {
        const { put } = await import("@vercel/blob");
        const urls: string[] = [];
        for (const f of files) {
          const blob = await put(`uploads/${filename(f.mimetype)}`, f.buffer, {
            access: "public",
            contentType: f.mimetype,
          });
          urls.push(blob.url);
        }
        return res.status(201).json({ urls });
      }

      if (!fs.existsSync(UPLOAD_DIR)) {
        return res.status(501).json({
          error: "Uploads are not configured on this server (set BLOB_READ_WRITE_TOKEN or use a host with a writable disk).",
        });
      }
      const base = `${req.protocol}://${req.get("host")}`;
      return res.status(201).json({ urls: files.map((f) => `${base}/uploads/${f.filename}`) });
    } catch (e: any) {
      console.error("upload failed:", e);
      return res.status(500).json({ error: "Upload failed. Please try again." });
    }
  });
});

export default router;
