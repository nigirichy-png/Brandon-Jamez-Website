/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSubscriberAccess } from "@/lib/entitlements/require-subscriber-access";
import { getPublishedSubscriberPost } from "@/lib/subscriber-content/data";
import { resolveSubscriberPostDetailMedia } from "@/lib/subscriber-content/media";
import { subscriberDetailImageSource } from "@/lib/subscriber-content/media-policy";

export const metadata: Metadata = { title: "Subscriber Post" };
const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

export default async function SubscriberPostPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSubscriberAccess();
  const { slug } = await params;
  if (!validSlug.test(slug) || slug.length > 100) notFound();
  const rawPost = await getPublishedSubscriberPost(slug);
  if (!rawPost) notFound();
  const post = await resolveSubscriberPostDetailMedia(rawPost);
  const mainImageSrc = subscriberDetailImageSource(post.content_image_src, post.cover_image_src);
  return <main id="main-content" className="flex-1"><article className="page-shell max-w-5xl py-12 sm:py-16 lg:py-24"><Link href="/subscriber" className="text-sm font-extrabold text-cyan-200 hover:text-cyan-100">← Subscriber area</Link><p className="eyebrow mt-10 text-fuchsia-300">Subscriber post</p><h1 className="font-display mt-4 text-[clamp(2.8rem,8vw,5.5rem)] font-bold leading-[0.94] tracking-[-0.055em] text-white">{post.title}</h1><p className="mt-4 text-sm font-bold text-zinc-500">Published {formatDate(post.published_at!)}</p>{post.excerpt ? <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">{post.excerpt}</p> : null}{mainImageSrc ? <img src={mainImageSrc} alt="" className="mt-10 max-h-[44rem] w-full rounded-2xl border border-white/10 object-contain" /> : null}<div className="mt-10 max-w-3xl whitespace-pre-line text-base leading-8 text-zinc-300">{post.body}</div>{post.media_url && post.media_type === "video" ? <video src={post.media_url} controls preload="metadata" className="mt-10 w-full rounded-2xl border border-white/10">Your browser does not support video playback.</video> : null}{post.media_url && post.media_type === "embed" ? <a href={post.media_url} target="_blank" rel="noopener noreferrer" className="mt-10 inline-flex min-h-12 items-center rounded-xl border border-white/15 px-5 font-extrabold text-white hover:border-cyan-300/40">Open external media ↗</a> : null}</article></main>;
}
