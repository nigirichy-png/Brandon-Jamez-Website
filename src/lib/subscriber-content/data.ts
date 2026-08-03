import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AdminSubscriberPost, SubscriberPostDetail, SubscriberPostSummary } from "./model";
import { findPublishedSubscriberPost, publishedSubscriberPosts } from "./visibility";

export async function listPublishedSubscriberPosts(): Promise<SubscriberPostSummary[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("list_published_subscriber_posts");
  if (error) throw new Error("subscriber_posts_unavailable");
  return publishedSubscriberPosts((data ?? []) as SubscriberPostSummary[]);
}

export async function getPublishedSubscriberPost(slug: string): Promise<SubscriberPostDetail | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_published_subscriber_post", { p_slug: slug });
  if (error) throw new Error("subscriber_post_unavailable");
  return findPublishedSubscriberPost((data ?? []) as SubscriberPostDetail[], slug);
}

export async function listAdminSubscriberPosts(): Promise<AdminSubscriberPost[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_list_subscriber_posts");
  if (error) throw new Error("admin_subscriber_posts_unavailable");
  return (data ?? []) as AdminSubscriberPost[];
}
