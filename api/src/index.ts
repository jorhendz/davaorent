import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import listingRoutes from "./routes/listings";
import favoriteRoutes from "./routes/favorites";
import inquiryRoutes from "./routes/inquiries";
import viewingRoutes from "./routes/viewings";
import applicationRoutes from "./routes/applications";
import reviewRoutes from "./routes/reviews";
import reportRoutes from "./routes/reports";
import adminRoutes from "./routes/admin";
import uploadRoutes, { UPLOAD_DIR } from "./routes/uploads";
import notificationRoutes from "./routes/notifications";
import paymentRoutes from "./routes/payments";
import rentalRoutes from "./routes/rentals";

const app = express();

// Lock CORS to specific origins in production via CORS_ORIGIN="https://your-web.vercel.app,https://davaorent.com"
const corsOrigins = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors(corsOrigins?.length ? { origin: corsOrigins } : {}));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d", immutable: true }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "davaorent-api" }));

app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/viewings", viewingRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/rentals", rentalRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// On Vercel the app is exported as a serverless handler instead of listening.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => console.log(`DavaoRent API running on http://localhost:${port}`));
}

export default app;
