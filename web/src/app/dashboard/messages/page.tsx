"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function MessagesPage() {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState<any[] | null>(null);
  const [open, setOpen] = useState<any | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user) {
      api<{ inquiries: any[] }>("/inquiries").then((d) => setInquiries(d.inquiries)).catch(() => setInquiries([]));
    }
  }, [user]);

  async function openConversation(id: string) {
    const d = await api<{ inquiry: any }>(`/inquiries/${id}`);
    setOpen(d.inquiry);
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!open || !reply.trim() || sending) return;
    setSending(true);
    try {
      await api(`/inquiries/${open.id}/messages`, { method: "POST", body: JSON.stringify({ body: reply }) });
      setReply("");
      await openConversation(open.id);
    } finally {
      setSending(false);
    }
  }

  if (!user) return null;
  const isOwnerSide = (inq: any) => inq.listing?.ownerId === user.id;

  return (
    <div>
      <h1 className="text-2xl font-bold">Messages</h1>
      <p className="text-sm text-gray-500">All communication stays inside DavaoRent for your safety.</p>

      {inquiries === null ? (
        <div className="card mt-6 p-10 text-center text-gray-400">Loading…</div>
      ) : inquiries.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-gray-500">
          <p className="text-3xl">💬</p>
          <p className="mt-2">No conversations yet.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="max-h-[540px] space-y-2 overflow-y-auto pr-1">
            {inquiries.map((inq) => (
              <button
                key={inq.id}
                onClick={() => openConversation(inq.id)}
                className={`card block w-full p-3 text-left transition hover:shadow-md ${
                  open?.id === inq.id ? "ring-2 ring-brand-500" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={inq.listing.photos?.[0]?.url} alt="" className="h-10 w-12 rounded-md bg-gray-100 object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{inq.listing.title}</p>
                    <p className="truncate text-xs text-gray-500">
                      {isOwnerSide(inq) ? `From ${inq.renter.name}` : "Your inquiry"}
                    </p>
                  </div>
                </div>
                {inq.messages[0] && (
                  <p className="mt-1.5 truncate text-xs text-gray-500">
                    {inq.messages[0].sender.name.split(" ")[0]}: {inq.messages[0].body}
                  </p>
                )}
              </button>
            ))}
          </div>

          {open ? (
            <div className="card flex h-[540px] flex-col p-4">
              <div className="border-b pb-2.5">
                <p className="font-semibold">{open.listing.title}</p>
                <p className="text-xs text-gray-500">
                  {open.listing.ownerId === user.id ? `Renter: ${open.renter.name}` : `Owner: ${open.listing.owner?.name}`}
                </p>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto py-3">
                {open.messages.map((m: any) => (
                  <div
                    key={m.id}
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                      m.sender.id === user.id ? "ml-auto rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-gray-100"
                    }`}
                  >
                    <p>{m.body}</p>
                    <p className={`mt-0.5 text-[10px] ${m.sender.id === user.id ? "text-brand-100" : "text-gray-400"}`}>
                      {m.sender.name.split(" ")[0]} · {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <form onSubmit={sendReply} className="flex gap-2 border-t pt-3">
                <input className="input" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type a message…" />
                <button className="btn-primary shrink-0" disabled={sending}>
                  Send
                </button>
              </form>
            </div>
          ) : (
            <div className="card grid h-[540px] place-items-center text-sm text-gray-400">
              Select a conversation to read and reply
            </div>
          )}
        </div>
      )}
    </div>
  );
}
