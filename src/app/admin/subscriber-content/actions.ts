"use server";

import { revalidatePath } from "next/cache";
import { requireRealAdmin } from "@/lib/admin/data";
import { isUuid } from "@/lib/admin/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { subscriberPostErrorMessage, validateSubscriberPostInput } from "@/lib/subscriber-content/validation";

export type SubscriberPostActionState = { tone: "idle" | "success" | "error"; message: string };

async function authorize(): Promise<SubscriberPostActionState | null> {
  const authorization = await requireRealAdmin("/admin/subscriber-content");
  return authorization.allowed ? null : { tone: "error", message: "An active administrator account is required." };
}

function validVersion(value: string): boolean { return value.length <= 64 && Number.isFinite(Date.parse(value)); }
function refreshPaths(slug?: string) {
  revalidatePath("/admin/subscriber-content");
  revalidatePath("/subscriber");
  if (slug) revalidatePath(`/subscriber/${slug}`);
}

export async function createSubscriberPostAction(_previous: SubscriberPostActionState, formData: FormData): Promise<SubscriberPostActionState> {
  const denied = await authorize();
  if (denied) return denied;
  const fields = validateSubscriberPostInput(formData);
  if (!fields.ok) return { tone: "error", message: fields.message };
  const supabase = await createServerSupabaseClient();
  const input = fields.value;
  const { error } = await supabase.rpc("admin_create_subscriber_post", {
    p_title: input.title, p_slug: input.slug, p_excerpt: input.excerpt, p_body: input.body,
    p_cover_image_url: input.coverImageUrl, p_media_url: input.mediaUrl,
    p_media_type: input.mediaType, p_status: input.status,
  });
  if (error) return { tone: "error", message: subscriberPostErrorMessage(error.message) };
  refreshPaths(input.slug);
  return { tone: "success", message: input.status === "published" ? "Subscriber post created and published." : "Subscriber post draft created." };
}

export async function updateSubscriberPostAction(postId: string, expectedUpdatedAt: string, previousSlug: string, _previous: SubscriberPostActionState, formData: FormData): Promise<SubscriberPostActionState> {
  if (!isUuid(postId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The post reference is invalid. Refresh the page." };
  const denied = await authorize();
  if (denied) return denied;
  const fields = validateSubscriberPostInput(formData);
  if (!fields.ok) return { tone: "error", message: fields.message };
  const supabase = await createServerSupabaseClient();
  const input = fields.value;
  const { error } = await supabase.rpc("admin_update_subscriber_post", {
    p_post_id: postId, p_expected_updated_at: expectedUpdatedAt, p_title: input.title,
    p_slug: input.slug, p_excerpt: input.excerpt, p_body: input.body,
    p_cover_image_url: input.coverImageUrl, p_media_url: input.mediaUrl,
    p_media_type: input.mediaType, p_status: input.status,
  });
  if (error) return { tone: "error", message: subscriberPostErrorMessage(error.message) };
  refreshPaths(previousSlug); refreshPaths(input.slug);
  return { tone: "success", message: "Subscriber post updated." };
}

export async function setSubscriberPostPublicationAction(postId: string, expectedUpdatedAt: string, slug: string, publish: boolean, _previous: SubscriberPostActionState, _formData: FormData): Promise<SubscriberPostActionState> {
  void _previous; void _formData;
  if (!isUuid(postId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The post reference is invalid. Refresh the page." };
  const denied = await authorize();
  if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_set_subscriber_post_publication", { p_post_id: postId, p_expected_updated_at: expectedUpdatedAt, p_publish: publish });
  if (error) return { tone: "error", message: subscriberPostErrorMessage(error.message) };
  refreshPaths(slug);
  return { tone: "success", message: publish ? "Subscriber post published." : "Subscriber post returned to draft." };
}

export async function deleteSubscriberPostAction(postId: string, expectedUpdatedAt: string, slug: string, _previous: SubscriberPostActionState, _formData: FormData): Promise<SubscriberPostActionState> {
  void _previous; void _formData;
  if (!isUuid(postId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The post reference is invalid. Refresh the page." };
  const denied = await authorize();
  if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_delete_subscriber_post", { p_post_id: postId, p_expected_updated_at: expectedUpdatedAt });
  if (error) return { tone: "error", message: subscriberPostErrorMessage(error.message) };
  refreshPaths(slug);
  return { tone: "success", message: "Subscriber post deleted." };
}
