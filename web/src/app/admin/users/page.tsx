"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";

const ROLE_CLS: Record<string, string> = {
  ADMIN: "bg-gray-900 text-white",
  OWNER: "bg-brand-100 text-brand-800",
  AGENCY: "bg-blue-100 text-blue-800",
  RENTER: "bg-gray-100 text-gray-700",
};

export default function UsersPage() {
  const { refreshStats } = useAdmin();
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api<{ users: any[] }>("/admin/users")
      .then((d) => setUsers(d.users))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function toggleIdentity(u: any) {
    setError("");
    try {
      await api(`/admin/users/${u.id}/verify`, {
        method: "PATCH",
        body: JSON.stringify({ verifiedIdentity: !u.verifiedIdentity }),
      });
      load();
      refreshStats();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return users.filter(
      (u) =>
        (role === "ALL" || u.role === role) &&
        (!term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
    );
  }, [users, q, role]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>
      <p className="text-sm text-gray-500">Search accounts and manage identity verification badges.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          className="input max-w-xs"
          placeholder="Search name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input w-40" value={role} onChange={(e) => setRole(e.target.value)}>
          {["ALL", "RENTER", "OWNER", "AGENCY", "ADMIN"].map((r) => (
            <option key={r} value={r}>
              {r === "ALL" ? "All roles" : r}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="card mt-4 overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Listings</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-gray-500">
                      {u.email}
                      {u.phone ? ` · ${u.phone}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${ROLE_CLS[u.role] || "bg-gray-100"}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 tabular-nums">{u._count.listings}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.verifiedEmail && <span className="badge bg-gray-100 text-gray-600">Email</span>}
                      {u.verifiedPhone && <span className="badge bg-gray-100 text-gray-600">Mobile</span>}
                      {u.verifiedIdentity && <span className="badge bg-brand-100 text-brand-800">Identity ✓</span>}
                      {!u.verifiedEmail && !u.verifiedPhone && !u.verifiedIdentity && (
                        <span className="text-xs text-gray-400">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-xs font-medium text-brand-600 hover:underline" onClick={() => toggleIdentity(u)}>
                      {u.verifiedIdentity ? "Remove identity badge" : "Verify identity"}
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No users match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
