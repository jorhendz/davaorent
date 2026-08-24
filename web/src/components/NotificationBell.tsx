"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
};

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<{ notifications: Notification[]; unread: number }>("/notifications")
      .then((d) => {
        setItems(d.notifications);
        setUnread(d.unread);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 45000);
    return () => clearInterval(t);
  }, [user, load]);

  // close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;

  async function markAllRead() {
    await api("/notifications/read-all", { method: "POST" }).catch(() => {});
    load();
  }

  async function openItem(n: Notification) {
    setOpen(false);
    if (!n.read) api(`/notifications/${n.id}/read`, { method: "PATCH" }).then(load).catch(() => {});
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-10 w-10 place-items-center rounded-lg text-lg hover:bg-gray-100"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
      >
        🔔
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-brand-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-400">Nothing here yet.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`block w-full border-b border-gray-50 px-4 py-3 text-left transition hover:bg-gray-50 ${
                    n.read ? "" : "bg-brand-50/50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{n.body}</p>
                      <p className="mt-1 text-[10px] text-gray-400">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
