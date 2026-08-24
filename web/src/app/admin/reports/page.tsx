"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";

const STATUS_FLOW = ["REPORTED", "UNDER_REVIEW", "ACTION_TAKEN", "RESOLVED", "CLOSED"];
const STATUS_CLS: Record<string, string> = {
  REPORTED: "bg-red-100 text-red-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-800",
  ACTION_TAKEN: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-brand-100 text-brand-800",
  CLOSED: "bg-gray-200 text-gray-600",
};

export default function ReportsPage() {
  const { refreshStats } = useAdmin();
  const [reports, setReports] = useState<any[]>([]);
  const [filter, setFilter] = useState("OPEN");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api<{ reports: any[] }>("/admin/reports")
      .then((d) => setReports(d.reports))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function update(id: string, status: string) {
    setError("");
    try {
      await api(`/admin/reports/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      load();
      refreshStats();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const visible = reports.filter((r) =>
    filter === "OPEN" ? !["RESOLVED", "CLOSED"].includes(r.status) : filter === "ALL" ? true : r.status === filter
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Reports & Complaints</h1>
      <p className="text-sm text-gray-500">
        Workflow: Reported → Under review → Action taken → Resolved → Closed.
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {["OPEN", ...STATUS_FLOW, "ALL"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filter === s ? "bg-brand-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {s === "OPEN" ? "Open" : s === "ALL" ? "All" : s.replace(/_/g, " ").toLowerCase()}
          </button>
        ))}
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="card mt-4 p-10 text-center text-gray-400">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="card mt-4 p-10 text-center text-gray-500">
          {filter === "OPEN" ? "🎉 No open reports." : "No reports match this filter."}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {visible.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`badge ${STATUS_CLS[r.status] || "bg-gray-100"}`}>{r.status.replace(/_/g, " ")}</span>
                    <span className="badge bg-gray-100 text-gray-700">{r.reason.replace(/_/g, " ")}</span>
                  </div>
                  <Link href={`/listings/${r.listing.id}`} className="mt-1.5 block font-semibold hover:text-brand-700">
                    {r.listing.title}
                  </Link>
                  <p className="text-xs text-gray-500">
                    Reported by {r.reporter.name} ({r.reporter.email}) · {new Date(r.createdAt).toLocaleString()} ·
                    listing status: {r.listing.status}
                  </p>
                  {r.details && <p className="mt-1.5 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">“{r.details}”</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {STATUS_FLOW.filter((s) => s !== r.status && s !== "REPORTED").map((s) => (
                    <button key={s} className="btn-secondary" onClick={() => update(r.id, s)}>
                      {s === "UNDER_REVIEW" ? "Start review" : s === "ACTION_TAKEN" ? "Action taken" : s === "RESOLVED" ? "Resolve" : "Close"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
