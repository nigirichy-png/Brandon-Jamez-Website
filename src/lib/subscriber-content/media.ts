import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { AdminSubscriberPost, SubscriberPostDetail, SubscriberPostSummary } from "./model";
import { isSafeSubscriberMediaPath, preferredSubscriberImageSource, SUBSCRIBER_MEDIA_BUCKET } from "./media-policy";

const SIGNED_URL_LIFETIME_SECONDS = 600;

async function signImagePath(path: string | null): Promise<string | null> {
  if (!path || !isSafeSubscriberMediaPath(path)) return null;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.storage.from(SUBSCRIBER_MEDIA_BUCKET).createSignedUrl(path, SIGNED_URL_LIFETIME_SECONDS);
  return error ? null : data.signedUrl;
}

export type SubscriberPostSummaryWithImage = SubscriberPostSummary & { cover_image_src: string | null };
export type SubscriberPostDetailWithImages = SubscriberPostDetail & { cover_image_src: string | null; content_image_src: string | null };
export type AdminSubscriberPostWithImages = AdminSubscriberPost & { cover_image_src: string | null; content_image_src: string | null };

export async function resolveSubscriberPostSummariesMedia(posts: SubscriberPostSummary[]): Promise<SubscriberPostSummaryWithImage[]> {
  return Promise.all(posts.map(async (post) => ({ ...post, cover_image_src: preferredSubscriberImageSource(await signImagePath(post.cover_image_path), post.cover_image_url) })));
}

export async function resolveSubscriberPostDetailMedia(post: SubscriberPostDetail): Promise<SubscriberPostDetailWithImages> {
  const [cover, content] = await Promise.all([signImagePath(post.cover_image_path), signImagePath(post.content_image_path)]);
  return { ...post, cover_image_src: preferredSubscriberImageSource(cover, post.cover_image_url), content_image_src: preferredSubscriberImageSource(content, post.media_type === "image" ? post.media_url : null) };
}

export async function resolveAdminSubscriberPostsMedia(posts: AdminSubscriberPost[]): Promise<AdminSubscriberPostWithImages[]> {
  return Promise.all(posts.map(async (post) => {
    const [cover, content] = await Promise.all([signImagePath(post.cover_image_path), signImagePath(post.content_image_path)]);
    return { ...post, cover_image_src: preferredSubscriberImageSource(cover, post.cover_image_url), content_image_src: preferredSubscriberImageSource(content, post.media_type === "image" ? post.media_url : null) };
  }));
}
