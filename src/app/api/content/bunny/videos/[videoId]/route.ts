import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { loadRealAccountState } from "@/lib/auth/access-state";
import { deleteBunnyVideo, getBunnyVideoStatus } from "@/lib/bunny/server";
import { requestIsSameOrigin, validBunnyUuid, validBunnyVersion } from "@/lib/bunny/validation";
import { listStaffPublicBunnyVideos } from "@/lib/public-bunny-video/data";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function response(body: Record<string, unknown> | null, status: number) {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  return body ? NextResponse.json(body, { status, headers }) : new NextResponse(null, { status, headers });
}

async function authorized(): Promise<boolean> {
  const account = await loadRealAccountState();
  return Boolean(account.user && !account.accessLoadFailed && !account.accountBlocked
    && (account.roles.includes("content_manager") || account.roles.includes("admin")));
}

function refreshVideos() {
  revalidateTag("published-public-bunny-videos", "max");
  revalidatePath("/videos");
  revalidatePath("/content/videos");
  revalidatePath("/admin/content/videos");
}

export async function POST(request: Request, context: { params: Promise<{ videoId: string }> }) {
  if (!requestIsSameOrigin(request)) return response({ error: "invalid_origin" }, 403);
  if (!await authorized()) return response({ error: "active_content_editor_required" }, 403);
  const { videoId } = await context.params;
  if (!validBunnyUuid(videoId)) return response({ error: "invalid_video_reference" }, 400);
  const video = (await listStaffPublicBunnyVideos()).find((item) => item.id === videoId);
  if (!video) return response({ error: "public_bunny_video_not_found" }, 404);
  try {
    const current = await getBunnyVideoStatus(video.provider_video_id);
    const admin = createAdminSupabaseClient();
    const { error } = await admin.rpc("service_update_public_bunny_video_status", {
      p_provider_video_id: video.provider_video_id,
      p_status: current.status,
      p_provider_status: current.providerStatus,
    });
    if (error) return response({ error: "video_status_update_failed" }, 500);
    refreshVideos();
    return response({ status: current.status }, 200);
  } catch {
    return response({ error: "bunny_status_unavailable" }, 503);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ videoId: string }> }) {
  if (!requestIsSameOrigin(request)) return response({ error: "invalid_origin" }, 403);
  if (!await authorized()) return response({ error: "active_content_editor_required" }, 403);
  const { videoId } = await context.params;
  if (!validBunnyUuid(videoId)) return response({ error: "invalid_video_reference" }, 400);
  let input: unknown;
  try { input = await request.json(); } catch { return response({ error: "invalid_request" }, 400); }
  if (!input || typeof input !== "object") return response({ error: "invalid_request" }, 400);
  const value = input as Record<string, unknown>;
  if (!validBunnyVersion(value.expectedUpdatedAt)
    || typeof value.title !== "string" || value.title.trim().length < 1 || value.title.trim().length > 120 || /[\p{Cc}\p{Cf}]/u.test(value.title)
    || typeof value.description !== "string" || value.description.trim().length > 500 || /[\p{Cc}\p{Cf}]/u.test(value.description)
    || typeof value.category !== "string" || value.category.trim().length > 60 || /[\p{Cc}\p{Cf}]/u.test(value.category)
    || typeof value.publish !== "boolean") return response({ error: "invalid_request" }, 400);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("content_update_public_bunny_video", {
    p_video_id: videoId,
    p_expected_updated_at: value.expectedUpdatedAt,
    p_title: value.title.trim(),
    p_short_description: value.description.trim(),
    p_category: value.category.trim(),
    p_publish: value.publish,
  });
  if (error) {
    if (error.message.includes("stale_public_bunny_video_version")) return response({ error: "stale_public_bunny_video_version" }, 409);
    if (error.message.includes("public_bunny_video_not_ready")) return response({ error: "public_bunny_video_not_ready" }, 409);
    return response({ error: "video_update_failed" }, 500);
  }
  refreshVideos();
  return response({ ok: true }, 200);
}

export async function DELETE(request: Request, context: { params: Promise<{ videoId: string }> }) {
  if (!requestIsSameOrigin(request)) return response({ error: "invalid_origin" }, 403);
  if (!await authorized()) return response({ error: "active_content_editor_required" }, 403);
  const { videoId } = await context.params;
  const expectedUpdatedAt = new URL(request.url).searchParams.get("version");
  if (!validBunnyUuid(videoId) || !validBunnyVersion(expectedUpdatedAt)) return response({ error: "invalid_video_reference" }, 400);
  const video = (await listStaffPublicBunnyVideos()).find((item) => item.id === videoId);
  if (!video) return response({ error: "public_bunny_video_not_found" }, 404);
  try {
    if (!await deleteBunnyVideo(video.provider_video_id)) return response({ error: "bunny_delete_failed" }, 502);
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("content_delete_public_bunny_video", { p_video_id: videoId, p_expected_updated_at: expectedUpdatedAt });
    if (error) return response({ error: error.message.includes("stale_public_bunny_video_version") ? "stale_public_bunny_video_version" : "video_detach_failed" }, error.message.includes("stale_public_bunny_video_version") ? 409 : 500);
    refreshVideos();
    return response(null, 204);
  } catch {
    return response({ error: "bunny_unavailable" }, 503);
  }
}
