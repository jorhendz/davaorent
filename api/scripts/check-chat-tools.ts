// Smoke test for the assistant's data tools — verifies the live queries work and
// that no private field (addressFull) leaks into a tool result.
// Run: npx tsx scripts/check-chat-tools.ts
import { PrismaClient } from "@prisma/client";
import { searchListings, getPlatformOverview, getMyActivity } from "../src/lib/chat-tools";

const prisma = new PrismaClient();

async function main() {
  console.log("--- search_listings: apartments up to ₱15,000 ---");
  const a: any = await searchListings({ category: "APARTMENT", maxPrice: 15000 });
  console.log(`total=${a.totalMatching} showing=${a.showing}`);
  a.listings.forEach((l: any) => console.log(`  ${l.title} — ${l.rate} — ${l.barangay} — ${l.link}`));

  console.log("\n--- privacy check ---");
  const anyListing: any = (await searchListings({ limit: 8 })).listings;
  const leaked = anyListing.filter((l: any) => "addressFull" in l);
  console.log(leaked.length === 0 ? "  OK: addressFull never returned" : `  LEAK: ${leaked.length} listings exposed addressFull`);

  console.log("\n--- search_listings: keyword 'Matina' ---");
  const m: any = await searchListings({ query: "Matina" });
  console.log(`  total=${m.totalMatching}:`, m.listings.map((l: any) => l.title).join(" | "));

  console.log("\n--- search_listings: cars priced per day ---");
  const c: any = await searchListings({ category: "CAR", priceUnit: "DAY" });
  console.log(`  total=${c.totalMatching}:`, c.listings.map((l: any) => `${l.title} ${l.rate}`).join(" | "));

  console.log("\n--- get_platform_overview ---");
  const o: any = await getPlatformOverview();
  console.log(`  published=${o.totalPublished} propertyVerified=${o.propertyVerified}`);
  console.log("  categories:", o.byCategory.map((x: any) => `${x.category}=${x.count}`).join(" "));
  console.log("  monthly:", JSON.stringify(o.monthlyPriceRange), " daily:", JSON.stringify(o.dailyPriceRange));

  console.log("\n--- get_my_activity: signed out ---");
  console.log(" ", JSON.stringify(await getMyActivity(undefined)));

  console.log("\n--- get_my_activity: owner account ---");
  const owner = await prisma.user.findUnique({ where: { email: "owner@davaorent.com" } });
  if (owner) {
    const act: any = await getMyActivity(owner.id);
    console.log(`  ${act.name} (${act.role}) unread=${act.unreadNotifications}`);
    console.log(
      `  listings=${act.myListings.length} applications=${act.applications.length} viewings=${act.viewings.length} activeRentals=${act.activeTrackedRentals.length}`
    );
    if (act.myListings[0]) {
      const l = act.myListings[0];
      console.log(`  latest listing: "${l.title}" status=${l.status} expiresInDays=${l.expiresInDays}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
