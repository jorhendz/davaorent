import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";

// Tools the DavaoRent assistant can call. All of them read live data and return
// PUBLIC fields only — addressFull is never selected (address-privacy rule).

export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_listings",
    description:
      "Search live, published DavaoRent listings. Use whenever the user asks what is available, " +
      "what something costs, or wants a recommendation. Returns public fields only — never an exact address.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free text: area, landmark, or keyword (e.g. 'Matina', 'near Abreeza')" },
        category: {
          type: "string",
          enum: [
            "APARTMENT", "BOARDING_HOUSE", "BEDSPACE", "ROOM", "CONDO", "HOUSE",
            "COMMERCIAL", "WAREHOUSE", "OFFICE",
            "CAR", "MOTORCYCLE", "EQUIPMENT", "EVENT", "APPLIANCE", "VACATION",
          ],
        },
        district: { type: "string", description: "Davao district, e.g. Talomo, Buhangin, Poblacion" },
        minPrice: { type: "number", description: "Minimum price in pesos" },
        maxPrice: { type: "number", description: "Maximum price in pesos" },
        priceUnit: { type: "string", enum: ["MONTH", "DAY"], description: "MONTH for spaces, DAY for vehicles/equipment" },
        bedrooms: { type: "number", description: "Minimum number of bedrooms" },
        limit: { type: "number", description: "Max results, 1-8 (default 5)" },
      },
      required: [],
    },
  },
  {
    name: "get_platform_overview",
    description:
      "Live totals for DavaoRent: how many listings are published per category, which districts have listings, " +
      "and the overall price range. Use for 'what do you have', 'how many', or 'where do you cover' questions.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_my_activity",
    description:
      "The signed-in user's own account activity: their listings (with review status), applications, viewings, " +
      "active tracked rentals and unread notifications. Only works when the user is logged in.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
];

const publishedWhere = (): any => ({
  status: "PUBLISHED",
  AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
});

export async function searchListings(input: any) {
  const where = publishedWhere();
  if (input?.category) where.category = input.category;
  if (input?.district) where.district = { contains: String(input.district) };
  if (input?.priceUnit) where.priceUnit = input.priceUnit;
  if (input?.bedrooms) where.bedrooms = { gte: Number(input.bedrooms) };
  if (input?.minPrice) where.price = { ...(where.price || {}), gte: Number(input.minPrice) };
  if (input?.maxPrice) where.price = { ...(where.price || {}), lte: Number(input.maxPrice) };
  if (input?.query) {
    const term = String(input.query);
    where.AND.push({
      OR: [
        { title: { contains: term } },
        { description: { contains: term } },
        { barangay: { contains: term } },
        { district: { contains: term } },
        { landmark: { contains: term } },
      ],
    });
  }

  const take = Math.min(8, Math.max(1, Number(input?.limit) || 5));
  const [total, listings] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take,
      select: {
        id: true, title: true, category: true, price: true, priceUnit: true,
        deposit: true, barangay: true, district: true, landmark: true,
        bedrooms: true, bathrooms: true, floorArea: true, furnished: true,
        parking: true, aircon: true, petFriendly: true, internet: true,
        availability: true, featured: true, verifiedProperty: true,
      },
    }),
  ]);

  return {
    totalMatching: total,
    showing: listings.length,
    listings: listings.map((l) => ({
      ...l,
      link: `/listings/${l.id}`,
      rate: `₱${l.price.toLocaleString("en-PH")}/${l.priceUnit === "DAY" ? "day" : "month"}`,
    })),
  };
}

export async function getPlatformOverview() {
  const where = publishedWhere();
  const [byCategory, byDistrict, total, verified, prices] = await Promise.all([
    prisma.listing.groupBy({ by: ["category"], _count: { _all: true }, where }),
    prisma.listing.groupBy({ by: ["district"], _count: { _all: true }, where }),
    prisma.listing.count({ where }),
    prisma.listing.count({ where: { ...where, verifiedProperty: true } }),
    prisma.listing.findMany({ where, select: { price: true, priceUnit: true } }),
  ]);
  const monthly = prices.filter((p) => p.priceUnit !== "DAY").map((p) => p.price);
  const daily = prices.filter((p) => p.priceUnit === "DAY").map((p) => p.price);
  return {
    totalPublished: total,
    propertyVerified: verified,
    byCategory: byCategory.map((c) => ({ category: c.category, count: c._count._all })).sort((a, b) => b.count - a.count),
    districts: byDistrict.map((d) => ({ district: d.district, count: d._count._all })).sort((a, b) => b.count - a.count),
    monthlyPriceRange: monthly.length ? { min: Math.min(...monthly), max: Math.max(...monthly) } : null,
    dailyPriceRange: daily.length ? { min: Math.min(...daily), max: Math.max(...daily) } : null,
  };
}

export async function getMyActivity(userId?: string) {
  if (!userId) return { signedIn: false, note: "No user is signed in. Ask them to log in at /login first." };

  const [user, listings, applications, viewings, rentals, unread] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, role: true, verifiedEmail: true, verifiedPhone: true, verifiedIdentity: true },
    }),
    prisma.listing.findMany({
      where: { ownerId: userId },
      select: { id: true, title: true, status: true, availability: true, adminNote: true, expiresAt: true, views: true, featured: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.application.findMany({
      where: { OR: [{ renterId: userId }, { listing: { ownerId: userId } }] },
      select: { id: true, status: true, moveInDate: true, listing: { select: { title: true, ownerId: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.viewingRequest.findMany({
      where: { OR: [{ renterId: userId }, { listing: { ownerId: userId } }] },
      select: { id: true, status: true, preferredDate: true, listing: { select: { title: true, ownerId: true } } },
      orderBy: { preferredDate: "asc" },
      take: 10,
    }),
    prisma.rentalTracking.findMany({
      where: { OR: [{ renterId: userId }, { ownerId: userId }], status: "ACTIVE" },
      select: { id: true, dueAt: true, listing: { select: { title: true } } },
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  const side = (ownerId: string) => (ownerId === userId ? "you are the owner" : "you are the renter");
  return {
    signedIn: true,
    name: user?.name,
    role: user?.role,
    verification: { email: user?.verifiedEmail, mobile: user?.verifiedPhone, identity: user?.verifiedIdentity },
    unreadNotifications: unread,
    myListings: listings.map((l) => ({
      ...l,
      expiresInDays: l.expiresAt ? Math.ceil((new Date(l.expiresAt).getTime() - Date.now()) / 86400000) : null,
    })),
    applications: applications.map((a) => ({
      status: a.status, listing: a.listing.title, moveInDate: a.moveInDate, role: side(a.listing.ownerId),
    })),
    viewings: viewings.map((v) => ({
      status: v.status, listing: v.listing.title, when: v.preferredDate, role: side(v.listing.ownerId),
    })),
    activeTrackedRentals: rentals.map((r) => ({ listing: r.listing.title, dueAt: r.dueAt })),
  };
}

export async function runChatTool(name: string, input: any, userId?: string) {
  switch (name) {
    case "search_listings":
      return await searchListings(input);
    case "get_platform_overview":
      return await getPlatformOverview();
    case "get_my_activity":
      return await getMyActivity(userId);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
