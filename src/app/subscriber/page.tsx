/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";

import { SubscriberVideoCard } from "@/components/subscriber/subscriber-video-card";
import { requireSubscriberAccess } from "@/lib/entitlements/require-subscriber-access";
import { listPublishedSubscriberPosts, listPublishedSubscriberVideos } from "@/lib/subscriber-content/data";
import { resolveSubscriberPostSummariesMedia } from "@/lib/subscriber-content/media";

export const metadata: Metadata = { title: "Subscriber" };
export const dynamic = "force-dynamic";
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)) : "";

export default async function SubscriberPage() {
  const state = await requireSubscriberAccess();
  const [postRows, videos] = await Promise.all([listPublishedSubscriberPosts(), listPublishedSubscriberVideos()]);
  const posts = resolveSubscriberPostSummariesMedia(postRows, true);
  const [featuredPost, ...remainingPosts] = posts;
  return <main id="main-content" className="platform-page platform-subscriber-page flex-1">
    <header className="platform-page-header platform-subscriber-header"><div className="platform-shell platform-subscriber-header-grid"><div><div className="platform-member-label"><span>Member area</span><b>18+</b></div><h1 className="platform-title">Your protected <span>Pattaya feed.</span></h1><p className="platform-copy">Welcome, {state.displayName ?? "Member"}. Private Storage files require fresh server authorization. External media is identified separately and is not made private by this page.</p><div className="platform-member-tags"><span>Protected posts</span><span>Private Storage</span><span>External media labeled</span></div></div><aside className="platform-member-status"><small>Access status</small><strong>Member access active</strong><p>Your current paid entitlement has been confirmed by the server.</p><Link href="/account" className="platform-button-secondary">Manage account</Link></aside></div></header>
    {videos.length ? <section className="platform-shell platform-subscriber-library" aria-labelledby="subscriber-videos-title"><div className="platform-list-heading"><div><p className="platform-kicker">Private streaming</p><h2 id="subscriber-videos-title">Member videos</h2></div><span>{videos.length} published</span></div><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{videos.map((video) => <SubscriberVideoCard key={video.id} video={video} />)}</div></section> : null}
    <section className="platform-shell platform-subscriber-library" aria-labelledby="subscriber-library-title"><div className="platform-list-heading"><div><p className="platform-kicker">Latest from Brandon</p><h2 id="subscriber-library-title">Member drops</h2></div><span>{posts.length} published</span></div>
      {featuredPost ? <article className="platform-subscriber-feature"><div className="platform-subscriber-image">{featuredPost.cover_image_src ? <img src={featuredPost.cover_image_src} alt="" /> : <span>Member post</span>}</div><div><p className="platform-kicker">Latest · {formatDate(featuredPost.published_at)}</p><h2>{featuredPost.title}</h2>{featuredPost.excerpt ? <p>{featuredPost.excerpt}</p> : null}<Link href={`/subscriber/${featuredPost.slug}`} className="platform-button-primary">Open post</Link></div></article> : <div className="platform-alert"><h2>No posts yet</h2><p>New member drops will appear here when published.</p></div>}
      {remainingPosts.length ? <ol className="platform-post-list">{remainingPosts.map((post, index) => <li key={post.id}><article><span>{String(index + 2).padStart(2, "0")}</span><div className="platform-post-thumb">{post.cover_image_src ? <img src={post.cover_image_src} alt="" /> : null}</div><div><p>{formatDate(post.published_at)}</p><h3>{post.title}</h3>{post.excerpt ? <small>{post.excerpt}</small> : null}</div><Link href={`/subscriber/${post.slug}`}>Open ↗</Link></article></li>)}</ol> : null}
    </section>
  </main>;
}
