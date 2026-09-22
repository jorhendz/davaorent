"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { Icon } from "./icons";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "davaorent_chat";
const GREETING: Msg = {
  role: "assistant",
  content:
    "Hi! 👋 I'm **Dara**, the DavaoRent assistant. I can help you find a rental, list your own property or vehicle, or explain how viewings, applications and verification work.\n\nWhat can I help you with?",
};

const SUGGESTIONS = [
  "Show me apartments in Matina under ₱15,000",
  "How do I list my car for rent?",
  "How do I know a listing is legit?",
  "What does it cost to use DavaoRent?",
];

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // restore conversation across page navigation
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
      }
    } catch {
      // ignore unreadable storage
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      // ignore full/blocked storage
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages, busy]);

  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || busy) return;
      setError("");
      setInput("");
      const next = [...messages, { role: "user" as const, content: question }];
      setMessages(next);
      setBusy(true);
      try {
        // Drop leading assistant turns (the canned greeting) — a conversation
        // sent to the model must start with a user message.
        const payload = next.slice(-20);
        while (payload.length && payload[0].role === "assistant") payload.shift();

        const d = await api<{ reply: string }>("/chat", {
          method: "POST",
          body: JSON.stringify({ messages: payload }),
        });
        setMessages((m) => [...m, { role: "assistant", content: d.reply }]);
      } catch (e: any) {
        setError(e?.message || "Couldn't reach the assistant. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [messages, busy]
  );

  // keep the console uncluttered for staff
  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      {/* launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Chat with the DavaoRent assistant"}
        className={`fixed bottom-5 right-5 z-50 flex h-14 items-center gap-2 rounded-full bg-brand-600 px-5 text-white shadow-xl transition-all duration-300 hover:bg-brand-700 hover:shadow-2xl ${
          open ? "scale-0 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <Icon name="chat" className="h-5 w-5" />
        <span className="text-sm font-semibold">Ask Dara</span>
      </button>

      {/* panel */}
      <div
        className={`fixed inset-x-3 bottom-3 z-50 flex max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 transition-all duration-300 sm:inset-x-auto sm:right-5 sm:h-[560px] sm:w-[400px] ${
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        }`}
        role="dialog"
        aria-label="DavaoRent assistant"
        aria-hidden={!open}
      >
        {/* header */}
        <div className="flex items-center gap-3 bg-gradient-to-br from-brand-800 to-brand-600 px-4 py-3 text-white">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 text-base font-bold ring-1 ring-white/30">
            D
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Dara — DavaoRent Assistant</p>
            <p className="flex items-center gap-1.5 text-xs text-brand-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Ask about rentals, listing, or safety
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-auto rounded-br-md bg-brand-600 text-white"
                  : "rounded-bl-md bg-white text-gray-800 shadow-sm ring-1 ring-gray-200"
              }`}
            >
              {m.role === "user" ? m.content : <RichText text={m.content} onNavigate={() => setOpen(false)} />}
            </div>
          ))}

          {busy && (
            <div className="flex w-fit gap-1.5 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          {messages.length === 1 && !busy && (
            <div className="space-y-1.5 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-xs font-medium text-gray-700 transition hover:border-brand-400 hover:text-brand-700"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-gray-100 bg-white p-3"
        >
          <input
            ref={inputRef}
            className="input h-11"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about DavaoRent…"
            maxLength={2000}
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send message"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
          >
            ➤
          </button>
        </form>
        <p className="border-t border-gray-100 bg-white px-3 pb-2 text-center text-[10px] text-gray-400">
          AI assistant — may make mistakes. Never share passwords or OTPs.
        </p>
      </div>
    </>
  );
}

/* Minimal renderer: **bold**, bullet lines, in-app links and emails. */
function RichText({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  return (
    <div className="space-y-1.5">
      {text.split("\n").map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const bullet = /^[-•*]\s+/.test(trimmed);
        return (
          <p key={i} className={bullet ? "flex gap-1.5" : ""}>
            {bullet && <span className="text-brand-600">•</span>}
            <span>{renderInline(bullet ? trimmed.replace(/^[-•*]\s+/, "") : trimmed, onNavigate)}</span>
          </p>
        );
      })}
    </div>
  );
}

// Matches **bold**, in-app paths (/search, /listings/abc), and emails.
const INLINE = /(\*\*[^*]+\*\*)|(\/(?:search|compare|login|register|listings|dashboard|admin)(?:\/[A-Za-z0-9_-]+)*)|([\w.+-]+@[\w-]+\.[\w.]+)/g;

function renderInline(text: string, onNavigate: () => void) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;

  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [match, bold, path, email] = m;

    if (bold) {
      out.push(
        <strong key={m.index} className="font-semibold">
          {bold.slice(2, -2)}
        </strong>
      );
    } else if (path) {
      out.push(
        <Link
          key={m.index}
          href={path}
          onClick={onNavigate}
          className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-600"
        >
          {path}
        </Link>
      );
    } else if (email) {
      out.push(
        <a key={m.index} href={`mailto:${email}`} className="font-medium text-brand-700 underline underline-offset-2">
          {email}
        </a>
      );
    }
    last = m.index + match.length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}
