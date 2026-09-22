# DavaoRent.com

The trusted local rental marketplace for Davao — *Find Your Next Space in Davao.*

Monorepo with two workspaces:

| Folder | Stack | Port |
| --- | --- | --- |
| `api/` | Express 4 + TypeScript + Prisma (SQLite) + Zod + JWT | 4000 |
| `web/` | Next.js 14 (App Router) + TypeScript + Tailwind CSS | 3000 |

## Quick start

```bash
npm install          # install all workspaces
npm run db:setup     # create SQLite schema + seed sample Davao listings
npm run dev          # runs API (:4000) and web (:3000) together
```

Then open http://localhost:3000.

### Seeded accounts (password: `password123`)

| Email | Role |
| --- | --- |
| `admin@davaorent.com` | ADMIN — moderation queue, reports, user verification |
| `owner@davaorent.com` | OWNER — sample published listings |
| `broker@davaorent.com` | AGENCY |
| `renter@davaorent.com` | RENTER |

## What's implemented (MVP scope)

**Renters** — browse without an account, search + filters (district, barangay, price, type, bedrooms, furnished, pets, parking, aircon, internet, verified), listing details with photo gallery, save favourites, in-app messaging with owners, viewing requests (in-person or virtual), rental applications with status tracking, reviews (gated behind a completed viewing or approved application), listing reports.

**Owners / Agencies** — guided listing form (address kept private; renters see only barangay/district until a viewing is confirmed), submit-for-review workflow (`DRAFT → SUBMITTED → PUBLISHED / NEEDS_REVISION / REJECTED`), availability management (`AVAILABLE / RESERVED / OCCUPIED`), inquiry inbox, viewing accept/decline/complete/no-show, application approve/decline (approval auto-reserves the listing), per-listing stats (views, inquiries, saves).

**Admins** — moderation queue by status with private address visible, approve / needs-revision / reject with notes, property-verification and identity-verification badges, report handling workflow, user directory, platform stats.

**Trust & safety baked in** — exact addresses never exposed by the public API, verification badges are specific (Identity Verified / Property Verified), review gating, report reasons matching the spec.

## API overview

All endpoints are under `http://localhost:4000/api`:

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /listings` (public search with filters), `GET /listings/:id`, `GET /listings/mine`
- `POST /listings`, `PATCH /listings/:id`, `POST /listings/:id/submit`, `POST /listings/:id/availability`
- `GET|POST|DELETE /favorites[/:listingId]`
- `GET|POST /inquiries`, `GET /inquiries/:id`, `POST /inquiries/:id/messages`
- `GET|POST /viewings`, `PATCH /viewings/:id`
- `GET|POST /applications`, `PATCH /applications/:id`
- `POST /reviews`, `POST /reports`
- `POST /uploads` (multipart `photos` field, up to 10 images / 8MB each; served from `/uploads/*`)
- `GET /listings/compare?ids=…` (side-by-side compare, up to 4), `POST /listings/:id/renew` (30-day renewal)
- `GET /notifications`, `POST /notifications/read-all`, `PATCH /notifications/:id/read`
- `GET /payments/plans`, `POST /payments/checkout` (sandbox featured-listing purchase), `GET /payments`
- `POST /chat` (support assistant; Claude-powered with live-listing tools when `ANTHROPIC_API_KEY` is set, keyword FAQ otherwise), `GET /chat/health`
- Admin: `GET|PATCH /admin/listings`, `PATCH /admin/listings/:id/verify`, `GET|PATCH /admin/reports`, `GET /admin/users`, `PATCH /admin/users/:id/verify`, `GET /admin/stats`

## Also implemented (future-phase systems)

In-app notifications (inquiries, messages, viewings, applications, moderation decisions, payments) with a navbar bell; listing expiration (30-day active window set on approval, hidden from search when expired, one-click renewal); compare tool (up to 4 listings side by side); featured-listing monetization (₱199/349/599 plans, sandbox checkout, payment records, billing history — swap the checkout handler for GCash/Maya at launch).

## Not yet built (next phases per the business plan)

OTP mobile verification, real payment gateways (GCash/Maya), map search, availability/price alerts, agency team accounts, email/SMS notification channels, property-management tools (leases, rent tracking).

## Deploying

See **[DEPLOYMENT.md](DEPLOYMENT.md)** — the repo is Vercel-ready: web deploys as a Next.js project (root `web`), the API deploys as a serverless Express function (root `api`) with Postgres (`prisma/schema.postgres.prisma`) and Vercel Blob uploads, all switched purely by environment variables.

## Production notes

- Swap SQLite for PostgreSQL by changing `datasource` in `api/prisma/schema.prisma` and `DATABASE_URL`.
- Set a strong `JWT_SECRET` in `api/.env`.
- Restrict CORS to your web origin in `api/src/index.ts`.
