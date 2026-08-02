"use server";

import { revalidatePath } from "next/cache";

import { requireRealAdmin } from "@/lib/admin/data";
import { isUuid } from "@/lib/admin/validation";
import type { CmsVideoPlatform } from "@/lib/cms/video-model";
import { isSupportedVideoUrl } from "@/lib/cms/video-links";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CmsActionState = {
  tone: "idle" | "success" | "error";
  message: string;
};

const platforms = new Set<CmsVideoPlatform>(["youtube", "rumble", "kick"]);

function value(formData: FormData, name: string): string | null {
  const candidate = formData.get(name);
  return typeof candidate === "string" ? candidate : null;
}

function containsControlCharacters(input: string): boolean {
  return /[\p{Cc}\p{Cf}]/u.test(input);
}

function parseVideoFields(formData: FormData):
  | { ok: true; title: string; description: string; platform: CmsVideoPlatform; url: string; category: string }
  | { ok: false; state: CmsActionState } {
  const title = value(formData, "title")?.trim() ?? "";
  const description = value(formData, "shortDescription")?.trim() ?? "";
  const platformValue = value(formData, "platform");
  const url = value(formData, "videoUrl")?.trim() ?? "";
  const category = value(formData, "category")?.trim() ?? "";

  if (!title || title.length > 120 || containsControlCharacters(title)) {
    return { ok: false, state: { tone: "error", message: "Enter a title between 1 and 120 characters." } };
  }
  if (description.length > 500 || containsControlCharacters(description)) {
    return { ok: false, state: { tone: "error", message: "The short description must be 500 characters or fewer." } };
  }
  if (category.length > 60 || containsControlCharacters(category)) {
    return { ok: false, state: { tone: "error", message: "The category must be 60 characters or fewer." } };
  }
  if (!platformValue || !platforms.has(platformValue as CmsVideoPlatform)) {
    return { ok: false, state: { tone: "error", message: "Choose a supported video platform." } };
  }
  const platform = platformValue as CmsVideoPlatform;
  if (url.length < 9 || url.length > 2048 || containsControlCharacters(url) || !isSupportedVideoUrl(platform, url)) {
    return { ok: false, state: { tone: "error", message: `Enter a valid HTTPS ${platform} video URL.` } };
  }
  return { ok: true, title, description, platform, url, category };
}

function validVersion(value: string): boolean {
  return value.length <= 64 && Number.isFinite(Date.parse(value));
}

async function authorize(): Promise<CmsActionState | null> {
  const authorization = await requireRealAdmin("/admin/content/videos");
  return authorization.allowed ? null : { tone: "error", message: "An active administrator account is required." };
}

function resultForError(error: { message: string } | null): CmsActionState {
  const message = error?.message ?? "";
  if (message.includes("stale_video_version")) {
    return { tone: "error", message: "This video changed after the page loaded. Refresh and review the latest version before trying again." };
  }
  if (message.includes("video_not_found")) {
    return { tone: "error", message: "This video no longer exists. Refresh the page to continue." };
  }
  if (message.includes("published_video_required")) {
    return { tone: "error", message: "Only a published video can be featured." };
  }
  if (message.includes("active_admin_required") || message.includes("permission denied")) {
    return { tone: "error", message: "An active administrator account is required." };
  }
  return { tone: "error", message: "The video change could not be completed safely. Please try again." };
}

function refreshVideoPaths() {
  revalidatePath("/admin/content");
  revalidatePath("/admin/content/videos");
  revalidatePath("/videos");
}

export async function createCmsVideoAction(_previous: CmsActionState, formData: FormData): Promise<CmsActionState> {
  const denied = await authorize();
  if (denied) return denied;
  const fields = parseVideoFields(formData);
  if (!fields.ok) return fields.state;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_create_cms_video", {
    p_title: fields.title,
    p_short_description: fields.description,
    p_platform: fields.platform,
    p_video_url: fields.url,
    p_category: fields.category,
  });
  if (error) return resultForError(error);
  refreshVideoPaths();
  return { tone: "success", message: "Draft video created." };
}

export async function updateCmsVideoAction(videoId: string, expectedUpdatedAt: string, _previous: CmsActionState, formData: FormData): Promise<CmsActionState> {
  if (!isUuid(videoId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The video reference is invalid. Refresh the page." };
  const denied = await authorize();
  if (denied) return denied;
  const fields = parseVideoFields(formData);
  if (!fields.ok) return fields.state;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_update_cms_video", {
    p_video_id: videoId,
    p_expected_updated_at: expectedUpdatedAt,
    p_title: fields.title,
    p_short_description: fields.description,
    p_platform: fields.platform,
    p_video_url: fields.url,
    p_category: fields.category,
  });
  if (error) return resultForError(error);
  refreshVideoPaths();
  return { tone: "success", message: data ? "Video details updated." : "No video details changed." };
}

export async function setCmsVideoPublicationAction(videoId: string, expectedUpdatedAt: string, publish: boolean, _previous: CmsActionState, _formData: FormData): Promise<CmsActionState> {
  void _previous;
  void _formData;
  if (!isUuid(videoId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The video reference is invalid. Refresh the page." };
  const denied = await authorize();
  if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_set_cms_video_publication", {
    p_video_id: videoId,
    p_publish: publish,
    p_expected_updated_at: expectedUpdatedAt,
  });
  if (error) return resultForError(error);
  refreshVideoPaths();
  return { tone: "success", message: data ? (publish ? "Video published." : "Video returned to draft.") : "Publication state was already current." };
}

export async function setCmsVideoFeaturedAction(videoId: string, expectedUpdatedAt: string, featured: boolean, _previous: CmsActionState, _formData: FormData): Promise<CmsActionState> {
  void _previous;
  void _formData;
  if (!isUuid(videoId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The video reference is invalid. Refresh the page." };
  const denied = await authorize();
  if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_set_cms_video_featured", {
    p_video_id: videoId,
    p_featured: featured,
    p_expected_updated_at: expectedUpdatedAt,
  });
  if (error) return resultForError(error);
  refreshVideoPaths();
  return { tone: "success", message: data ? (featured ? "Featured video updated." : "Video removed from featured placement.") : "Featured state was already current." };
}

export async function reorderCmsVideoAction(videoId: string, expectedUpdatedAt: string, displayOrder: number, _previous: CmsActionState, _formData: FormData): Promise<CmsActionState> {
  void _previous;
  void _formData;
  if (!isUuid(videoId) || !validVersion(expectedUpdatedAt) || !Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 1_000_000) {
    return { tone: "error", message: "The requested display order is invalid. Refresh the page." };
  }
  const denied = await authorize();
  if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_reorder_cms_video", {
    p_video_id: videoId,
    p_display_order: displayOrder,
    p_expected_updated_at: expectedUpdatedAt,
  });
  if (error) return resultForError(error);
  refreshVideoPaths();
  return { tone: "success", message: data ? `Display order changed to ${displayOrder}.` : "Display order was already current." };
}

export async function deleteCmsVideoAction(videoId: string, expectedUpdatedAt: string, _previous: CmsActionState, _formData: FormData): Promise<CmsActionState> {
  void _previous;
  void _formData;
  if (!isUuid(videoId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The video reference is invalid. Refresh the page." };
  const denied = await authorize();
  if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_delete_cms_video", {
    p_video_id: videoId,
    p_expected_updated_at: expectedUpdatedAt,
  });
  if (error) return resultForError(error);
  refreshVideoPaths();
  return { tone: "success", message: "Video deleted." };
}
