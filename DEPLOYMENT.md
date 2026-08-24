# Deploying DavaoRent to Vercel

The monorepo deploys as **two Vercel projects** from the same git repository:

| Project | Root Directory | What it is |
| --- | --- | --- |
| `davaorent-api` | `api` | Express API as a single serverless function |
| `davaorent-web` | `web` | Next.js site |

Local development is unchanged (`npm run dev`, SQLite, disk uploads). Production
uses Postgres + Vercel Blob via environment variables only — no code changes.

---

## 0. Prerequisites

- Push this repository to GitHub/GitLab/Bitbucket.
- A Postgres database URL. Easiest options:
  - **Vercel Postgres / Neon**: Vercel Dashboard → Storage → Create Database → Postgres. Copy the `DATABASE_URL` (pooled) connection string.
  - Any other Postgres (Supabase, Railway…) works too.

## 1. Deploy the API

1. Vercel → **Add New Project** → import the repo.
2. **Root Directory:** `api` (leave framework as "Other"; the `vercel.json` and `vercel-build` script take over).
3. Environment variables:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | your Postgres connection string |
   | `JWT_SECRET` | a long random string |
   | `CORS_ORIGIN` | your web URL(s), e.g. `https://davaorent-web.vercel.app` (add after step 2 if you don't know it yet) |
   | `BLOB_READ_WRITE_TOKEN` | from Vercel → Storage → Blob → Create store → connect to this project |

4. Deploy. The build runs `vercel-build`, which generates the Prisma client
   against `prisma/schema.postgres.prisma` and pushes the schema to Postgres.
5. Verify: `https://<api-domain>/api/health` → `{"ok":true}`.

### Seed production data (optional)

From your machine, pointing at the production database:

```bash
cd api
set DATABASE_URL=postgres://...        # PowerShell: $env:DATABASE_URL="postgres://..."
npm run db:seed:pg
```

## 2. Deploy the web app

1. Vercel → **Add New Project** → import the same repo again.
2. **Root Directory:** `web` (Next.js is auto-detected; Vercel handles the npm workspace install).
3. Environment variable:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | the API project's URL, e.g. `https://davaorent-api.vercel.app` — **no trailing slash** |

4. Deploy, then go back to the API project and set/update `CORS_ORIGIN` to this web URL and redeploy the API.

## 3. Production checklist

- [ ] `JWT_SECRET` is long and random (not the dev default).
- [ ] `CORS_ORIGIN` lists only your real web origins.
- [ ] Blob store connected (photo uploads return `https://…blob.vercel-storage.com/...` URLs).
- [ ] Seeded admin password changed (log in as `admin@davaorent.com` — or edit `api/prisma/seed.ts` before seeding).
- [ ] Custom domains added to both projects if you own `davaorent.com`.

## How the pieces work

- **`api/api/index.ts` + `api/vercel.json`** — every request is rewritten to one serverless function that exports the Express app. `src/index.ts` skips `app.listen` when `VERCEL` is set.
- **Two Prisma schemas** — `schema.prisma` (SQLite, dev) and `schema.postgres.prisma` (Postgres + `rhel-openssl-3.0.x` engine for Vercel). They must be kept in sync when models change.
- **Uploads** — `src/routes/uploads.ts` switches to Vercel Blob automatically when `BLOB_READ_WRITE_TOKEN` exists; otherwise it uses the local `uploads/` folder (dev, Railway, a VPS…).
- **Known serverless caveat** — listing photos uploaded to Blob are permanent public URLs; the local `/uploads/*` static route is only used in disk mode.

## Alternative: API on a traditional host

The API also runs unchanged on Railway/Render/Fly or any Node server
(`npm run build && npm start`), where SQLite-on-disk and local uploads work as
in dev. In that case you only deploy `web` to Vercel and point
`NEXT_PUBLIC_API_URL` at your API host.
