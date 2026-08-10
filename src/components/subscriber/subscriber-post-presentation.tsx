/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { BunnyHlsPlayer } from "@/components/video/bunny-hls-player";
import type { SubscriberPostPresentationModel } from "@/lib/subscriber-content/media";
import { subscriberDetailImageSource } from "@/lib/subscriber-content/media-policy";
import { normalizeSubscriberExternalMedia } from "@/lib/subscriber-content/validation";

const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));

export function SubscriberPostPresentation({ post, backHref, backLabel, preview = false }: { post: SubscriberPostPresentationModel; backHref: string; backLabel: string; preview?: boolean }) {
  const mainImageSrc = subscriberDetailImageSource(post.content_image_src, post.cover_image_src);
  const externalMedia = post.media_url && (post.media_type === "video" || post.media_type === "embed")
    ? normalizeSubscriberExternalMedia(post.media_type, post.media_url)
    : null;
  const paragraphs = post.body.split(/\n{2,}/).filter(Boolean);

  return <article className="platform-page platform-subscriber-post py-8 sm:py-12"><div className="platform-shell">
    <Link href={backHref} className="platform-subscriber-back"><span aria-hidden="true">←</span>{backLabel}</Link>
    {preview ? <p className="platform-preview-note">Administrator preview—this page can include unpublished content.</p> : null}
    <header className="platform-article-header"><p className="platform-kicker">{preview ? "Preview" : "Member post"} · {post.published_at ? formatDate(post.published_at) : "Draft"}</p><h1 className="platform-title">{post.title}</h1>{post.excerpt ? <p className="platform-copy">{post.excerpt}</p> : null}</header>
    {mainImageSrc ? <figure className="platform-article-image"><img src={mainImageSrc} alt="" /></figure> : null}
    <div className="platform-reading-column">{paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}</div>
    {post.bunny_video_playback_src ? <>
      <p className="platform-media-boundary platform-media-private"><strong>Private streaming video</strong><span>Adaptive HLS playback is authorized by the server and delivered directly by the video CDN.</span></p>
      <BunnyHlsPlayer playbackEndpoint={post.bunny_video_playback_src} title={post.title} className="platform-article-media" />
    </> : null}
    {post.private_video_src ? <>
      <p className="platform-media-boundary platform-media-private"><strong>Private Storage video</strong><span>This file is delivered through a short-lived, server-authorized media request.</span></p>
      <video src={post.private_video_src} controls preload="metadata" className="platform-article-media">Your browser does not support video playback.</video>
    </> : !post.bunny_video_playback_src && externalMedia ? <>
      <p className="platform-media-boundary platform-media-external"><strong>External media</strong><span>Subscriber page access does not make this provider or a known external URL private.</span></p>
      {externalMedia.kind === "video"
        ? <video src={externalMedia.url} controls preload="metadata" className="platform-article-media">Your browser does not support video playback.</video>
        : <div className="platform-article-embed"><iframe src={externalMedia.url} title={`${post.title} — ${externalMedia.provider} video`} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-presentation" /></div>}
    </> : null}
  </div></article>;
}
