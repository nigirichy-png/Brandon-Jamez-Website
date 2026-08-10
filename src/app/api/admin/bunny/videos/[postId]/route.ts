import { NextResponse } from "next/server";

import { loadRealAccountState } from "@/lib/auth/access-state";
import { deleteBunnyVideo } from "@/lib/bunny/server";
import { requestIsSameOrigin, validBunnyUuid, validBunnyVersion } from "@/lib/bunny/validation";
import { listAdminSubscriberVideos } from "@/lib/subscriber-content/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function response(body: Record<string, unknown> | null, status: number) {
  return body ? NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } }) : new NextResponse(null, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function PATCH(request: Request, context: { params: Promise<{ postId: string }> }) {
  if (!requestIsSameOrigin(request)) return response({ error: "invalid_origin" }, 403);
  const account = await loadRealAccountState();
  if (!account.user || account.accessLoadFailed || account.accountBlocked || !account.roles.includes("admin")) return response({ error: "active_admin_required" }, 403);
  const { postId: videoId } = await context.params;
  if (!validBunnyUuid(videoId)) return response({ error: "invalid_video_reference" }, 400);
  let input: unknown;
  try { input = await request.json(); } catch { return response({ error: "invalid_request" }, 400); }
  if (!input || typeof input !== "object") return response({ error: "invalid_request" }, 400);
  const value = input as Record<string, unknown>;
  if (!validBunnyVersion(value.expectedUpdatedAt)
    || typeof value.title !== "string" || value.title.trim().length < 1 || value.title.trim().length > 160 || /[\p{Cc}\p{Cf}]/u.test(value.title)
    || typeof value.description !== "string" || value.description.trim().length > 500 || /[\p{Cc}\p{Cf}]/u.test(value.description)
    || typeof value.publish !== "boolean") return response({ error: "invalid_request" }, 400);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_update_subscriber_bunny_video", {
    p_video_id: videoId, p_expected_updated_at: value.expectedUpdatedAt, p_title: value.title.trim(),
    p_description: value.description.trim(), p_publish: value.publish,
  });
  if (error) {
    if (error.message.includes("stale_subscriber_video_version")) return response({ error: "stale_subscriber_video_version" }, 409);
    if (error.message.includes("subscriber_bunny_video_not_ready")) return response({ error: "subscriber_bunny_video_not_ready" }, 409);
    return response({ error: "video_update_failed" }, 500);
  }
  return response({ ok: true }, 200);
}

export async function DELETE(request: Request, context: { params: Promise<{ postId: string }> }) {
  if (!requestIsSameOrigin(request)) return response({ error: "invalid_origin" }, 403);
  const account = await loadRealAccountState();
  if (!account.user || account.accessLoadFailed || account.accountBlocked || !account.roles.includes("admin")) return response({ error: "active_admin_required" }, 403);
  const { postId: videoId } = await context.params;
  const expectedUpdatedAt = new URL(request.url).searchParams.get("version");
  if (!validBunnyUuid(videoId) || !validBunnyVersion(expectedUpdatedAt)) return response({ error: "invalid_video_reference" }, 400);

  const video = (await listAdminSubscriberVideos()).find((item) => item.id === videoId);
  if (!video) return response({ error: "subscriber_bunny_video_not_found" }, 404);
  try {
    if (!await deleteBunnyVideo(video.provider_video_id)) return response({ error: "bunny_delete_failed" }, 502);
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("admin_delete_subscriber_bunny_video", { p_video_id: videoId, p_expected_updated_at: expectedUpdatedAt });
    if (error) return response({ error: error.message.includes("stale_subscriber_post_version") ? "stale_subscriber_post_version" : "video_detach_failed" }, error.message.includes("stale_subscriber_post_version") ? 409 : 500);
    return response(null, 204);
  } catch { return response({ error: "bunny_unavailable" }, 503); }
}
