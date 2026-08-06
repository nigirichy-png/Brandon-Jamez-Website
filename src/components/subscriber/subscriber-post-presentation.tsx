/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import type { SubscriberPostDetailWithImages } from "@/lib/subscriber-content/media";
import { subscriberDetailImageSource } from "@/lib/subscriber-content/media-policy";
import { normalizeSubscriberExternalMedia } from "@/lib/subscriber-content/validation";

const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));

export function SubscriberPostPresentation({ post, backHref, backLabel, preview = false }: { post: SubscriberPostDetailWithImages; backHref: string; backLabel: string; preview?: boolean }) {
  const mainImageSrc = subscriberDetailImageSource(post.content_image_src, post.cover_image_src);
  const externalMedia = post.media_url && (post.media_type === "video" || post.media_type === "embed") ? normalizeSubscriberExternalMedia(post.media_type, post.media_url) : null;
  const paragraphs = post.body.split(/\n{2,}/).filter(Boolean);
  return <article className="platform-page platform-subscriber-post py-8 sm:py-12"><div className="platform-shell"><Link href={backHref} className="platform-subscriber-back"><span aria-hidden="true">←</span>{backLabel}</Link>{preview ? <p className="platform-preview-note">Administrator preview—this page can include unpublished content.</p> : null}<header className="platform-article-header"><p className="platform-kicker">{preview ? "Preview" : "Member post"} · {post.published_at ? formatDate(post.published_at) : "Draft"}</p><h1 className="platform-title">{post.title}</h1>{post.excerpt ? <p className="platform-copy">{post.excerpt}</p> : null}</header>{mainImageSrc ? <figure className="platform-article-image"><img src={mainImageSrc} alt="" /></figure> : null}<div className="platform-reading-column">{paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}</div>{externalMedia?.kind === "video" ? <video src={externalMedia.url} controls preload="metadata" className="platform-article-media">Your browser does not support video playback.</video> : null}{externalMedia?.kind === "embed" ? <div className="platform-article-embed"><iframe src={externalMedia.url} title={`${post.title} — ${externalMedia.provider} video`} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" /></div> : null}</div></article>;
}
