/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { SubscriberPostDetailWithImages } from "@/lib/subscriber-content/media";
import { normalizeSubscriberExternalMedia } from "@/lib/subscriber-content/validation";
import { subscriberDetailImageSource } from "@/lib/subscriber-content/media-policy";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

export function SubscriberPostPresentation({ post, backHref, backLabel, preview = false }: { post: SubscriberPostDetailWithImages; backHref: string; backLabel: string; preview?: boolean }) {
  const mainImageSrc = subscriberDetailImageSource(post.content_image_src, post.cover_image_src);
  const externalMedia = post.media_url && (post.media_type === "video" || post.media_type === "embed") ? normalizeSubscriberExternalMedia(post.media_type, post.media_url) : null;
  const paragraphs = post.body.split(/\n{2,}/).filter(Boolean);
  return <article className="page-shell max-w-5xl py-12 sm:py-16 lg:py-24"><Link href={backHref} className="text-sm font-extrabold text-cyan-200 hover:text-cyan-100">← {backLabel}</Link>{preview ? <p className="mt-8 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-4 text-sm font-bold text-amber-100">Administrator preview — this page can include unpublished content.</p> : null}<p className="eyebrow mt-10 text-fuchsia-300">{preview ? "Admin-only preview" : "Subscriber post"}</p><h1 className="font-display mt-4 text-[clamp(2.8rem,8vw,5.5rem)] font-bold leading-[0.94] tracking-[-0.055em] text-white">{post.title}</h1><p className="mt-4 text-sm font-bold text-zinc-500">{post.published_at ? `Published ${formatDate(post.published_at)}` : "Draft — not published"}</p>{post.excerpt ? <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">{post.excerpt}</p> : null}{mainImageSrc ? <div className="mt-10 flex max-h-[38rem] max-w-4xl justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/20"><img src={mainImageSrc} alt="" className="max-h-[38rem] h-auto w-auto max-w-full object-contain" /></div> : null}<div className="mt-10 max-w-3xl space-y-6 text-base leading-8 text-zinc-300">{paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}</div>{externalMedia?.kind === "video" ? <video src={externalMedia.url} controls preload="metadata" className="mt-10 max-h-[38rem] w-full max-w-4xl rounded-2xl border border-white/10 bg-black">Your browser does not support video playback.</video> : null}{externalMedia?.kind === "embed" ? <div className="mt-10 aspect-video w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black"><iframe src={externalMedia.url} title={`${post.title} — ${externalMedia.provider} video`} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" className="size-full" /></div> : null}</article>;
}
