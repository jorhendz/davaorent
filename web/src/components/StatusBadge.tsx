const COLORS: Record<string, string> = {
  // listing statuses
  DRAFT: "bg-gray-200 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-800",
  NEEDS_REVISION: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-brand-100 text-brand-800",
  REJECTED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-gray-200 text-gray-600",
  // availability
  AVAILABLE: "bg-brand-100 text-brand-800",
  RESERVED: "bg-amber-100 text-amber-800",
  OCCUPIED: "bg-gray-200 text-gray-700",
  // viewings & applications
  REQUESTED: "bg-blue-100 text-blue-800",
  UNDER_REVIEW: "bg-amber-100 text-amber-800",
  INFO_NEEDED: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-brand-100 text-brand-800",
  APPROVED: "bg-brand-100 text-brand-800",
  COMPLETED: "bg-gray-200 text-gray-700",
  DECLINED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-200 text-gray-600",
  WITHDRAWN: "bg-gray-200 text-gray-600",
  NO_SHOW: "bg-red-100 text-red-700",
  RESCHEDULED: "bg-amber-100 text-amber-800",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${COLORS[status] || "bg-gray-100 text-gray-700"}`}>{status.replace(/_/g, " ")}</span>
  );
}
