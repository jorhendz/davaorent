// Repoint every listing photo at a verified, category-relevant image.
// Each candidate URL is HEAD-checked; dead ones are replaced by a working
// URL from the same category (or the global fallback).
import { PrismaClient } from "@prisma/client";
import { PHOTO_SETS, FALLBACK_PHOTO } from "./photo-urls";

const prisma = new PrismaClient();

async function urlOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  // verify all candidates once
  const verified: Record<string, string[]> = {};
  for (const [cat, urls] of Object.entries(PHOTO_SETS)) {
    const ok: string[] = [];
    for (const u of urls) {
      if (await urlOk(u)) ok.push(u);
      else console.log(`  dead: ${cat} ${u.slice(34, 70)}…`);
    }
    verified[cat] = ok;
  }
  const fallbackOk = (await urlOk(FALLBACK_PHOTO)) ? FALLBACK_PHOTO : null;

  const listings = await prisma.listing.findMany({ include: { photos: { orderBy: { sort: "asc" } } } });
  let updated = 0;
  for (const l of listings) {
    const pool = verified[l.category]?.length
      ? verified[l.category]
      : fallbackOk
      ? [fallbackOk]
      : [];
    if (pool.length === 0) {
      console.log(`SKIP ${l.category} ${l.title} — no working photos`);
      continue;
    }
    for (let i = 0; i < l.photos.length; i++) {
      await prisma.listingPhoto.update({
        where: { id: l.photos[i].id },
        data: { url: pool[i % pool.length] },
      });
      updated++;
    }
    console.log(`${l.category.padEnd(15)} ${l.title.slice(0, 45)} -> ${pool.length} verified photo(s)`);
  }
  console.log(`Updated ${updated} photos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
