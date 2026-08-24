// Professional stroke-icon set (24x24, 1.8px stroke, round caps — Lucide-style).
// All icons inherit currentColor so they recolor with text utilities.

export type IconName =
  | "apartment" | "boarding" | "bedspace" | "room" | "condo" | "house"
  | "commercial" | "office" | "warehouse"
  | "car" | "motorcycle" | "equipment" | "events" | "appliance" | "vacation"
  | "sofa" | "snowflake" | "wifi" | "paw" | "bolt" | "pin"
  | "search" | "chat" | "key" | "pencil" | "shield" | "filter";

const PATHS: Record<IconName, React.ReactNode> = {
  apartment: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M9 7h1.5M13.5 7h1.5M9 10.5h1.5M13.5 10.5h1.5M9 14h1.5M13.5 14h1.5" />
      <path d="M10.5 21v-3.5h3V21" />
    </>
  ),
  boarding: (
    <>
      <path d="M2.5 21v-8.5L8 8l5.5 4.5V21" />
      <path d="M13.5 21v-9.5L17.5 8l4 3.5V21" />
      <path d="M2 21h20" />
      <path d="M6.5 21v-4h3v4" />
    </>
  ),
  bedspace: (
    <>
      <path d="M2 18V8" />
      <path d="M2 14h20v4" />
      <circle cx="6.5" cy="10.5" r="1.7" />
      <path d="M10.5 14v-3.5h7.5a4 4 0 0 1 4 3.5" />
    </>
  ),
  room: (
    <>
      <path d="M4 21h16" />
      <path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21" />
      <circle cx="14.7" cy="12" r="0.9" />
    </>
  ),
  condo: (
    <>
      <path d="M3 21V8.5h7.5V21" />
      <path d="M13.5 21V3.5H21V21" />
      <path d="M6 12h1.5M6 15.5h1.5M16.5 7h1.5M16.5 10.5h1.5M16.5 14h1.5" />
      <path d="M2 21h20" />
    </>
  ),
  house: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-5.5h4V21" />
    </>
  ),
  commercial: (
    <>
      <path d="M4.5 8L6 3.5h12L19.5 8" />
      <path d="M3.5 8h17" />
      <path d="M5 8v13h14V8" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  office: (
    <>
      <rect x="3" y="7.5" width="18" height="13" rx="2" />
      <path d="M9 7.5V5.5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 12.5h18" />
    </>
  ),
  warehouse: (
    <>
      <path d="M3 21V9l9-5.5L21 9v12" />
      <path d="M7 21v-8.5h10V21" />
      <path d="M7 15.5h10M7 18.5h10" />
    </>
  ),
  car: (
    <>
      <path d="M5 16l1.3-4.5A2 2 0 0 1 8.2 10h7.6a2 2 0 0 1 1.9 1.5L19 16" />
      <path d="M3 19v-1a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1" />
      <circle cx="7.5" cy="19" r="1.4" />
      <circle cx="16.5" cy="19" r="1.4" />
    </>
  ),
  motorcycle: (
    <>
      <circle cx="5.5" cy="17" r="2.8" />
      <circle cx="18.5" cy="17" r="2.8" />
      <path d="M5.5 17l3.5-6.5h3.5l3 6.5" />
      <path d="M12.5 10.5L14 8h3l1.5 3" />
    </>
  ),
  equipment: (
    <>
      <path d="M14.7 6.3a4.5 4.5 0 0 0-6.1 5.9L3 17.8 6.2 21l5.6-5.6a4.5 4.5 0 0 0 5.9-6.1L14.5 12l-2.5-2.5 2.7-3.2z" />
    </>
  ),
  events: (
    <>
      <path d="M12 4v3.5" />
      <path d="M12 7.5L19.5 20M12 7.5L4.5 20" />
      <path d="M2.5 20h19" />
      <path d="M12 14l2.8 6M12 14l-2.8 6" />
    </>
  ),
  appliance: (
    <>
      <rect x="4.5" y="3" width="15" height="18" rx="2" />
      <circle cx="12" cy="13.5" r="4" />
      <path d="M9.8 13.5a2.2 2.2 0 0 0 4.4 0" />
      <path d="M7.5 6.5h.01M10.5 6.5h.01" />
    </>
  ),
  vacation: (
    <>
      <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8H3.5a8.5 8.5 0 0 1 8.5-8z" />
      <path d="M12 3.5v8" />
      <path d="M12 11.5V19a2 2 0 0 0 4 1.5" />
    </>
  ),
  sofa: (
    <>
      <path d="M5 11V8.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2V11" />
      <path d="M3 13.5a2 2 0 0 1 4 0V15h10v-1.5a2 2 0 0 1 4 0V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M5.5 19v1.5M18.5 19v1.5" />
    </>
  ),
  snowflake: (
    <>
      <path d="M12 2.5v19M3.5 7l17 10M20.5 7l-17 10" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.5 9.5a15 15 0 0 1 19 0" />
      <path d="M5.8 13a10 10 0 0 1 12.4 0" />
      <path d="M9.2 16.2a5 5 0 0 1 5.6 0" />
      <circle cx="12" cy="19.3" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  paw: (
    <>
      <circle cx="6.7" cy="9" r="1.6" />
      <circle cx="12" cy="7" r="1.6" />
      <circle cx="17.3" cy="9" r="1.6" />
      <path d="M12 11.5c-3 0-5.5 2.5-5.5 4.8 0 1.5 1.2 2.4 2.5 2.4 1.1 0 1.9-.5 3-.5s1.9.5 3 .5c1.3 0 2.5-.9 2.5-2.4 0-2.3-2.5-4.8-5.5-4.8z" />
    </>
  ),
  bolt: (
    <>
      <path d="M13 2.5L4.5 14H10l-1 7.5L17.5 10H12l1-7.5z" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21.5S5 15.7 5 10a7 7 0 0 1 14 0c0 5.7-7 11.5-7 11.5z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8L21 21" />
    </>
  ),
  chat: (
    <>
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.6 0-3.1-.4-4.4-1.2L3 20l1.2-5.1A8.5 8.5 0 1 1 21 11.5z" />
      <path d="M8.5 10.5h7M8.5 13.5h4.5" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="16.5" r="4" />
      <path d="M10.3 13.7L21 3" />
      <path d="M17 7l3 3" />
    </>
  ),
  pencil: (
    <>
      <path d="M17 3.5l3.5 3.5L8 19.5 3.5 20.5 4.5 16 17 3.5z" />
      <path d="M14.5 6l3.5 3.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.5l7.5 3v5.5c0 5-3.2 8.6-7.5 10.5-4.3-1.9-7.5-5.5-7.5-10.5V5.5z" />
      <path d="M9 11.5l2 2 4-4.5" />
    </>
  ),
  filter: (
    <>
      <path d="M3 5h18l-7 8v5.5l-4 2.5v-8L3 5z" />
    </>
  ),
};

export function Icon({ name, className = "h-6 w-6" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
