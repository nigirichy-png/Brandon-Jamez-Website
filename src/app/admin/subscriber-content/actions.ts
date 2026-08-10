"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireRealAdmin } from "@/lib/admin/data";
import { isUuid } from "@/lib/admin/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildSubscriberMediaPath, buildSubscriberVideoPath, isSafeSubscriberMediaPath, SUBSCRIBER_MEDIA_BUCKET, validateSubscriberImageFile, validateSubscriberVideoFile, type SubscriberImageKind, type SubscriberImageMimeType, type SubscriberVideoMimeType } from "@/lib/subscriber-content/media-policy";
import { subscriberPostErrorMessage, validateSubscriberPostInput } from "@/lib/subscriber-content/validation";

export type SubscriberPostActionState = { tone: "idle" | "success" | "error"; message: string };

async function authorize(): Promise<SubscriberPostActionState | null> {
  const authorization = await requireRealAdmin("/admin/subscriber-content");
  return authorization.allowed ? null : { tone: "error", message: "An active administrator account is required." };
}

function validVersion(value: string): boolean { return value.length <= 64 && Number.isFinite(Date.parse(value)); }
function refreshPaths(slug?: string) {
  revalidatePath("/admin/subscriber-content");
  revalidatePath("/admin/audit");
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
  const { data, error } = await supabase.rpc("admin_set_subscriber_post_publication", { p_post_id: postId, p_expected_updated_at: expectedUpdatedAt, p_publish: publish });
  if (error) return { tone: "error", message: subscriberPostErrorMessage(error.message) };
  refreshPaths(slug);
  return { tone: "success", message: data ? (publish ? "Subscriber post published." : "Subscriber post returned to draft.") : "Publication state was already current." };
}

export async function deleteSubscriberPostAction(postId: string, expectedUpdatedAt: string, slug: string, _previous: SubscriberPostActionState, _formData: FormData): Promise<SubscriberPostActionState> {
  void _previous; void _formData;
  if (!isUuid(postId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The post reference is invalid. Refresh the page." };
  const denied = await authorize();
  if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const { data: posts, error: lookupError } = await supabase.rpc("admin_list_subscriber_posts");
  if (lookupError) return { tone: "error", message: subscriberPostErrorMessage(lookupError.message) };
  const post = posts?.find((candidate) => candidate.id === postId);
  if (!post) return { tone: "error", message: "This post no longer exists. Refresh the page." };
  if (post.bunny_video_id) return { tone: "error", message: "Remove the Bunny streaming video before deleting this post." };
  const { error } = await supabase.rpc("admin_delete_subscriber_post", { p_post_id: postId, p_expected_updated_at: expectedUpdatedAt });
  if (error) return { tone: "error", message: subscriberPostErrorMessage(error.message) };
  const paths = [post.cover_image_path, post.content_image_path, post.video_path].filter((path): path is string => Boolean(path && isSafeSubscriberMediaPath(path, postId)));
  const cleanup = paths.length ? await supabase.storage.from(SUBSCRIBER_MEDIA_BUCKET).remove(paths) : { error: null };
  refreshPaths(slug);
  return { tone: "success", message: cleanup.error ? "Subscriber post deleted. Stored media cleanup needs attention." : "Subscriber post deleted." };
}

export async function uploadSubscriberPostImageAction(postId: string, expectedUpdatedAt: string, slug: string, kind: SubscriberImageKind, _previous: SubscriberPostActionState, formData: FormData): Promise<SubscriberPostActionState> {
  if (!isUuid(postId) || !validVersion(expectedUpdatedAt) || (kind !== "cover" && kind !== "content")) return { tone: "error", message: "The image request is invalid. Refresh the page." };
  const denied = await authorize();
  if (denied) return denied;
  const file = formData.get("image");
  if (!(file instanceof File)) return { tone: "error", message: "Choose an image to upload." };
  const validationError = await validateSubscriberImageFile(file);
  if (validationError) return { tone: "error", message: validationError };

  const path = buildSubscriberMediaPath(postId, kind, file.type as SubscriberImageMimeType, randomUUID());
  const supabase = await createServerSupabaseClient();
  const { error: uploadError } = await supabase.storage.from(SUBSCRIBER_MEDIA_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { tone: "error", message: "The private image upload failed. Please try again." };

  const { data: previousPath, error: updateError } = await supabase.rpc("admin_set_subscriber_post_image_path", { p_post_id: postId, p_kind: kind, p_path: path, p_expected_updated_at: expectedUpdatedAt });
  if (updateError) {
    await supabase.storage.from(SUBSCRIBER_MEDIA_BUCKET).remove([path]);
    return { tone: "error", message: subscriberPostErrorMessage(updateError.message) };
  }

  let cleanupFailed = false;
  if (previousPath && isSafeSubscriberMediaPath(previousPath, postId, kind)) {
    const cleanup = await supabase.storage.from(SUBSCRIBER_MEDIA_BUCKET).remove([previousPath]);
    cleanupFailed = Boolean(cleanup.error);
  }
  refreshPaths(slug);
  return { tone: "success", message: cleanupFailed ? "Private image replaced. Previous-file cleanup needs attention." : `Private ${kind} image uploaded.` };
}

export async function removeSubscriberPostImageAction(postId: string, expectedUpdatedAt: string, slug: string, kind: SubscriberImageKind, _previous: SubscriberPostActionState, _formData: FormData): Promise<SubscriberPostActionState> {
  void _previous; void _formData;
  if (!isUuid(postId) || !validVersion(expectedUpdatedAt) || (kind !== "cover" && kind !== "content")) return { tone: "error", message: "The image request is invalid. Refresh the page." };
  const denied = await authorize();
  if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const { data: previousPath, error } = await supabase.rpc("admin_set_subscriber_post_image_path", { p_post_id: postId, p_kind: kind, p_path: null, p_expected_updated_at: expectedUpdatedAt });
  if (error) return { tone: "error", message: subscriberPostErrorMessage(error.message) };
  let cleanupFailed = false;
  if (previousPath && isSafeSubscriberMediaPath(previousPath, postId, kind)) {
    const cleanup = await supabase.storage.from(SUBSCRIBER_MEDIA_BUCKET).remove([previousPath]);
    cleanupFailed = Boolean(cleanup.error);
  }
  refreshPaths(slug);
  return { tone: "success", message: cleanupFailed ? "Image removed from the post. Stored-file cleanup needs attention." : `Private ${kind} image removed.` };
}

export async function uploadSubscriberPostVideoAction(postId: string, expectedUpdatedAt: string, slug: string, _previous: SubscriberPostActionState, formData: FormData): Promise<SubscriberPostActionState> {
  if (!isUuid(postId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The video request is invalid. Refresh the page." };
  const denied = await authorize();
  if (denied) return denied;
  const file = formData.get("video");
  if (!(file instanceof File)) return { tone: "error", message: "Choose a video to upload." };
  const validationError = await validateSubscriberVideoFile(file);
  if (validationError) return { tone: "error", message: validationError };

  const path = buildSubscriberVideoPath(postId, file.type as SubscriberVideoMimeType, randomUUID());
  const supabase = await createServerSupabaseClient();
  const { error: uploadError } = await supabase.storage.from(SUBSCRIBER_MEDIA_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { tone: "error", message: "The private video upload failed. Please try again." };

  const { data: previousPath, error: updateError } = await supabase.rpc("admin_set_subscriber_post_image_path", { p_post_id: postId, p_kind: "video", p_path: path, p_expected_updated_at: expectedUpdatedAt });
  if (updateError) {
    await supabase.storage.from(SUBSCRIBER_MEDIA_BUCKET).remove([path]);
    return { tone: "error", message: subscriberPostErrorMessage(updateError.message) };
  }

  let cleanupFailed = false;
  if (previousPath && isSafeSubscriberMediaPath(previousPath, postId, "video")) {
    const cleanup = await supabase.storage.from(SUBSCRIBER_MEDIA_BUCKET).remove([previousPath]);
    cleanupFailed = Boolean(cleanup.error);
  }
  refreshPaths(slug);
  return { tone: "success", message: cleanupFailed ? "Private video replaced. Previous-file cleanup needs attention." : "Private video uploaded." };
}

export async function removeSubscriberPostVideoAction(postId: string, expectedUpdatedAt: string, slug: string, _previous: SubscriberPostActionState, _formData: FormData): Promise<SubscriberPostActionState> {
  void _previous; void _formData;
  if (!isUuid(postId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The video request is invalid. Refresh the page." };
  const denied = await authorize();
  if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const { data: previousPath, error } = await supabase.rpc("admin_set_subscriber_post_image_path", { p_post_id: postId, p_kind: "video", p_path: null, p_expected_updated_at: expectedUpdatedAt });
  if (error) return { tone: "error", message: subscriberPostErrorMessage(error.message) };
  let cleanupFailed = false;
  if (previousPath && isSafeSubscriberMediaPath(previousPath, postId, "video")) {
    const cleanup = await supabase.storage.from(SUBSCRIBER_MEDIA_BUCKET).remove([previousPath]);
    cleanupFailed = Boolean(cleanup.error);
  }
  refreshPaths(slug);
  return { tone: "success", message: cleanupFailed ? "Video removed from the post. Stored-file cleanup needs attention." : "Private video removed." };
}
