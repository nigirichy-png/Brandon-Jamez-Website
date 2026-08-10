"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { LiveChatMessage } from "@/lib/live/model";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function fromRow(row: { id: number; session_id: string; author_key: string; author_display_name: string; body: string; status: "visible" | "deleted"; created_at: string; updated_at: string }): LiveChatMessage {
  return { id: row.id, sessionId: row.session_id, authorKey: row.author_key, authorDisplayName: row.author_display_name, body: row.body, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function LiveChat({ sessionId, initialMessages, canWrite, chatOpen }: { sessionId: string; initialMessages: LiveChatMessage[]; canWrite: boolean; chatOpen: boolean }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const channel = supabase.channel(`live-chat:${sessionId}`).on("postgres_changes", { event: "*", schema: "public", table: "live_chat_messages", filter: `session_id=eq.${sessionId}` }, (payload) => {
      const next = payload.new as Parameters<typeof fromRow>[0];
      if (!next?.id) return;
      const message = fromRow(next);
      setMessages((current) => [...current.filter((item) => item.id !== message.id), message].sort((a, b) => a.id - b.id).slice(-250));
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [sessionId, supabase]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    startTransition(async () => {
      const { error } = await supabase.rpc("send_live_chat_message", { p_session_id: sessionId, p_body: body });
      if (error) setNotice(error.message.includes("rate_limited") ? "Please wait before sending another message." : "The message could not be sent.");
      else { setText(""); setNotice(""); }
    });
  }

  return <section aria-labelledby="live-chat-title" className="border border-white/10 bg-black/20 p-4">
    <h2 id="live-chat-title" className="font-display text-xl font-bold text-white">Live chat</h2>
    <div aria-live="polite" className="mt-4 h-80 space-y-3 overflow-y-auto pr-2">{messages.length ? messages.map((message) => <p key={message.id} className="text-sm leading-6 text-zinc-300"><strong className="text-white">{message.authorDisplayName}</strong> <span className={message.status === "deleted" ? "italic text-zinc-600" : ""}>{message.body}</span></p>) : <p className="text-sm text-zinc-500">No chat messages yet.</p>}</div>
    {canWrite && chatOpen ? <form onSubmit={submit} className="mt-4 flex gap-2"><label className="sr-only" htmlFor="live-chat-message">Message</label><input id="live-chat-message" value={text} onChange={(event) => setText(event.target.value)} maxLength={500} required disabled={pending} className="min-h-11 flex-1 border border-white/15 bg-black/30 px-3 text-white" /><button type="submit" disabled={pending} className="min-h-11 border border-white/15 px-4 font-bold text-white">Send</button></form> : <p className="mt-4 text-sm text-zinc-500">{canWrite ? "Chat opens when the stream is live." : "Sign in with an active account to write. Guests can read."}</p>}
    {notice ? <p role="alert" className="mt-2 text-sm text-rose-200">{notice}</p> : null}
  </section>;
}

