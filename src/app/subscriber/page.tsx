/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";

import { requireSubscriberAccess } from "@/lib/entitlements/require-subscriber-access";
import { listPublishedSubscriberPosts } from "@/lib/subscriber-content/data";
import { resolveSubscriberPostSummariesMedia } from "@/lib/subscriber-content/media";

export const metadata: Metadata = { title: "Subscriber" };
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)) : "";

export default async function SubscriberPage() {
  const state = await requireSubscriberAccess();
  const posts = await resolveSubscriberPostSummariesMedia(await listPublishedSubscriberPosts());
  const [featuredPost, ...remainingPosts] = posts;
  return <main id="main-content" className="platform-page flex-1">
    <header className="platform-shell platform-page-header py-10 sm:py-14"><p className="platform-kicker">Subscriber area</p><h1 className="platform-title">More from Brandon.</h1><p className="platform-copy">Welcome, {state.displayName ?? "Subscriber"}. Private posts, selected images and media in one simple protected space.</p><Link href="/account" className="platform-button-secondary">Back to account</Link></header>
    <section className="platform-shell pb-12 sm:pb-16" aria-labelledby="subscriber-library-title"><div className="platform-list-heading"><h2 id="subscriber-library-title">Latest posts</h2><span>{posts.length} published</span></div>
      {featuredPost ? <article className="platform-subscriber-feature"><div className="platform-subscriber-image">{featuredPost.cover_image_src ? <img src={featuredPost.cover_image_src} alt="" /> : <span>Subscriber post</span>}</div><div><p className="platform-kicker">Latest · {formatDate(featuredPost.published_at)}</p><h2>{featuredPost.title}</h2>{featuredPost.excerpt ? <p>{featuredPost.excerpt}</p> : null}<Link href={`/subscriber/${featuredPost.slug}`} className="platform-button-primary">Open post</Link></div></article> : <div className="platform-alert"><h2>No posts yet</h2><p>New subscriber updates will appear when published.</p></div>}
      {remainingPosts.length ? <ol className="platform-post-list">{remainingPosts.map((post, index) => <li key={post.id}><article><span>{String(index + 2).padStart(2, "0")}</span><div className="platform-post-thumb">{post.cover_image_src ? <img src={post.cover_image_src} alt="" /> : null}</div><div><p>{formatDate(post.published_at)}</p><h3>{post.title}</h3>{post.excerpt ? <small>{post.excerpt}</small> : null}</div><Link href={`/subscriber/${post.slug}`}>Open ↗</Link></article></li>)}</ol> : null}
    </section>
  </main>;
}
