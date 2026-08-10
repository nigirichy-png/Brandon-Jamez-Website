import type { Metadata } from "next";

import { LiveChat } from "@/components/live/live-chat";
import { LivePlayer } from "@/components/live/live-player";
import { loadRealAccountState } from "@/lib/auth/access-state";
import { getCurrentLiveSession, listLiveChatMessages } from "@/lib/live/data";

export const metadata: Metadata = { title: "Live" };
export const dynamic = "force-dynamic";

export default async function LivePage() {
  const [session, account] = await Promise.all([getCurrentLiveSession().catch(() => null), loadRealAccountState()]);
  const messages = session ? await listLiveChatMessages(session.id).catch(() => []) : [];
  const canWrite = Boolean(account.user && !account.accessLoadFailed && !account.accountBlocked);
  return <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
    <header className="mb-6"><p className="text-xs font-extrabold uppercase tracking-[.13em] text-cyan-300">Live</p><h1 className="font-display mt-2 text-4xl font-bold text-white">{session?.title ?? "Brandon Jamez Live"}</h1></header>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]"><LivePlayer session={session} />{session ? <LiveChat sessionId={session.id} initialMessages={messages} canWrite={canWrite} chatOpen={session.status === "live"} /> : <section className="border border-white/10 bg-black/20 p-6 text-zinc-500">Chat will appear with the next configured stream.</section>}</div>
  </main>;
}

