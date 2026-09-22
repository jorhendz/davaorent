// Keyword-matched answers used when ANTHROPIC_API_KEY is not configured, or when
// the API call fails. Keeps the chat widget useful instead of dead.

// `weak` keywords are generic question phrases ("how much"). They nudge a topic
// but must never outrank a specific term like "deposit" or "viewing".
type Faq = { keywords: string[]; weak?: string[]; answer: string };
const WEAK_WEIGHT = 2;

const FAQS: Faq[] = [
  {
    keywords: ["free", "libre", "cost to use", "bayad ba", "charge", "pricing"],
    weak: ["how much", "magkano", "fee", "cost"],
    answer:
      "DavaoRent is 100% free for renters — searching, messaging owners, requesting viewings and applying all cost nothing. Listing is also free for owners; only optional Featured promotion is paid (₱199 for 7 days, ₱349 for 15, ₱599 for 30).",
  },
  {
    keywords: ["featured", "promote", "boost", "advertis", "top of search"],
    answer:
      "Featured listings appear at the top of search with a Featured badge and homepage exposure. Plans: ₱199 / 7 days, ₱349 / 15 days, ₱599 / 30 days. Owners can buy one from Dashboard → Promotions.",
  },
  {
    keywords: [
      "how do i list", "post a", "add listing", "paano mag", "magpa-rent", "rent out", "advertise my",
      "list my", "cost to list", "listing fee", "list a property", "list my property", "become an owner",
    ],
    answer:
      "Log in as an Owner or Agency, then go to Dashboard → Add Listing. The guided form takes about 5 minutes: basics and price, location, details and features, then photos. Submit it and our team reviews it — usually live within 24 hours. Listing is free.",
  },
  {
    keywords: ["address", "exact location", "where exactly", "street"],
    answer:
      "For everyone's safety, public pages only show the barangay, district and a nearby landmark. The exact address is shared with you automatically once the owner confirms your viewing request.",
  },
  {
    keywords: ["viewing", "visit", "ocular", "tingnan", "see the place", "tour"],
    answer:
      "Open a listing and tap Request a Viewing, then pick a date and time (in-person or virtual). The owner can accept, decline or propose another schedule — and once they confirm, you'll see the exact address in Dashboard → Viewings.",
  },
  {
    keywords: ["application", "apply", "mag-apply", "rental application"],
    answer:
      "After viewing a place you can submit a rental application from the listing page — move-in date, number of occupants, length of stay and an optional message. Track it in Dashboard → Applications: Submitted → Under Review → Approved or Declined.",
  },
  {
    keywords: ["scam", "legit", "fake", "safe", "ligtas", "trust", "fraud"],
    answer:
      "Every listing is reviewed by our team before it goes live, and you'll see Identity Verified and Property Verified badges on trusted ones. Always view a property before paying anything, keep chat inside DavaoRent, and never send a deposit to someone rushing you. Use the Report button on any suspicious listing.",
  },
  {
    keywords: ["deposit", "advance", "payment", "pay rent", "gcash", "maya", "bayaran"],
    answer:
      "DavaoRent doesn't hold or process rent and deposits — you pay the owner directly once you've both agreed and you've seen the place. In Davao, one month deposit plus one month advance is typical. We never ask renters to send money through the platform.",
  },
  {
    keywords: ["verify", "verification", "badge", "verified"],
    answer:
      "There are three specific badges: Mobile Verified, Identity Verified (government ID checked by our admins) and Property Verified (ownership or authority documents checked). Your documents are never shown publicly — only the badge.",
  },
  {
    keywords: ["car", "vehicle", "motor", "sasakyan", "equipment", "tracking", "gps"],
    answer:
      "Yes — DavaoRent covers cars, motorcycles, equipment, event gear, appliances and vacation stays, not just property. Vehicle and equipment rentals also get the Rental Tracker: a due-back date, odometer readings, and optional live location sharing between renter and owner.",
  },
  {
    keywords: ["compare", "side by side", "shortlist"],
    answer:
      "Tap ⇄ Compare on any listing in search (up to 4), then open /compare to see them side by side — rate, deposit, location, rooms, features and verification all lined up.",
  },
  {
    keywords: ["expire", "renew", "30 days", "how long", "still active"],
    answer:
      "Published listings stay active for 30 days, then drop out of search. You'll see a reminder in Dashboard → My Properties and can renew for another 30 days in one tap.",
  },
  {
    keywords: ["reject", "needs revision", "not approved", "declined my listing", "review my listing"],
    answer:
      "Every listing goes through review before publishing. If it needs changes you'll see the admin's note on the listing in Dashboard → My Properties — fix it, then submit again. Most reviews finish within 24 hours.",
  },
  {
    keywords: ["area", "district", "barangay", "where do you", "cover", "saan"],
    answer:
      "We cover Davao City — Poblacion, Talomo, Buhangin, Agdao, Toril, Bunawan, Tugbok, Calinan and more. Popular searches include Matina, Bajada, Lanang, Ma-a, Ecoland and Toril. Browse everything at /search.",
  },
  {
    keywords: ["account", "sign up", "register", "log in", "password"],
    answer:
      "Create a free account at /register — choose Renter, Owner or Agency. You can browse without an account, but you'll need one to message owners, request viewings or apply. (Never share your password with anyone, including us.)",
  },
  {
    keywords: ["contact", "human", "support", "email", "talk to"],
    answer:
      "You can reach the DavaoRent team at hello@davaorent.com — we usually reply within the day, Davao time.",
  },
];

const GREETINGS = ["hi", "hello", "hey", "kumusta", "kamusta", "maayong", "good morning", "good afternoon", "good evening"];

export function faqAnswer(question: string): string {
  const q = question.toLowerCase().trim();

  if (!q) return fallbackText();

  if (GREETINGS.some((g) => q === g || q.startsWith(g + " ") || q.startsWith(g + "!"))) {
    return "Hello! 👋 I'm Dara, the DavaoRent assistant. I can help with finding rentals, listing your own property or vehicle, viewings, applications, and staying safe from scams. What do you need?";
  }

  // Best match = highest score; specific terms score by length, generic phrases
  // contribute only WEAK_WEIGHT so they can break ties but not win outright.
  let best: { faq: Faq; score: number } | null = null;
  for (const faq of FAQS) {
    let score = 0;
    for (const k of faq.keywords) if (q.includes(k)) score += k.length;
    for (const k of faq.weak ?? []) if (q.includes(k)) score += WEAK_WEIGHT;
    if (score > 0 && (!best || score > best.score)) best = { faq, score };
  }

  return best ? best.faq.answer : fallbackText();
}

function fallbackText(): string {
  return [
    "I can help with:",
    "• Finding a rental — browse and filter at /search",
    "• Listing your property or vehicle — Dashboard → Add Listing (free)",
    "• Viewings, applications and how renting works here",
    "• Pricing, verification badges and staying safe from scams",
    "",
    "Ask me any of those, or email hello@davaorent.com to reach a person.",
  ].join("\n");
}
