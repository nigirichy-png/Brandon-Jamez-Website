/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { requireSubscriberAccess } from "@/lib/entitlements/require-subscriber-access";
import { listPublishedSubscriberPosts } from "@/lib/subscriber-content/data";
import { resolveSubscriberPostSummariesMedia } from "@/lib/subscriber-content/media";

export const metadata: Metadata = { title: "Subscriber" };

function formatDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)) : "";
}

export default async function SubscriberPage() {
  const state = await requireSubscriberAccess();
  const posts = await resolveSubscriberPostSummariesMedia(await listPublishedSubscriberPosts());
  return <main id="main-content" className="flex-1">
    <section className="page-shell pb-12 pt-12 sm:pb-16 sm:pt-16 lg:pb-20 lg:pt-24"><p className="eyebrow text-emerald-300">Subscriber access active</p><h1 className="font-display mt-4 max-w-4xl text-[clamp(3rem,9vw,6rem)] font-bold leading-[0.92] tracking-[-0.06em] text-white">Welcome, {state.displayName ?? "Subscriber"}.</h1><p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">Your published subscriber updates are collected here.</p><Link href="/account" className="mt-8 inline-flex min-h-12 items-center rounded-full border border-white/15 px-6 text-sm font-extrabold text-white hover:bg-white/[0.06]">Back to Account</Link></section>
    <section className="border-t border-white/10 bg-[var(--page-deep)]"><div className="page-shell py-14 sm:py-20 lg:py-24"><p className="eyebrow text-fuchsia-300">Subscriber library</p><h2 className="font-display mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">Latest subscriber content</h2>
      {posts.length ? <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{posts.map((post) => <article key={post.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#12151c]">{post.cover_image_src ? <img src={post.cover_image_src} alt="" className="aspect-video w-full object-cover" /> : null}<div className="p-6 sm:p-7"><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-cyan-300">{formatDate(post.published_at)}</p><h3 className="font-display mt-3 text-2xl font-bold text-white">{post.title}</h3>{post.excerpt ? <p className="mt-3 text-sm leading-7 text-zinc-400">{post.excerpt}</p> : null}<Link href={`/subscriber/${post.slug}`} className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-white/15 px-4 text-sm font-extrabold text-white hover:border-cyan-300/40">Read post</Link></div></article>)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-[#12151c] p-8 text-center"><h3 className="font-display text-2xl font-bold text-white">No subscriber posts yet</h3><p className="mt-2 text-zinc-400">New subscriber updates will appear here when they are published.</p></div>}
    </div></section>
  </main>;
}
