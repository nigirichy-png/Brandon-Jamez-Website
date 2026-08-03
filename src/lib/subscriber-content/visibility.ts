import type { SubscriberPostDetail, SubscriberPostSummary } from "./model";

export function publishedSubscriberPosts<T extends SubscriberPostSummary>(posts: T[]): T[] {
  return posts.filter((post) => post.status === "published" && Boolean(post.published_at));
}

export function findPublishedSubscriberPost(posts: SubscriberPostDetail[], slug: string): SubscriberPostDetail | null {
  return publishedSubscriberPosts(posts).find((post) => post.slug === slug) ?? null;
}
