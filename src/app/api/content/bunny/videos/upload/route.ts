import { NextResponse } from "next/server";

import { loadRealAccountState } from "@/lib/auth/access-state";
import { createBunnyTusCredentials, createBunnyVideo, deleteBunnyVideo } from "@/lib/bunny/server";
import { requestIsSameOrigin, validBunnyUploadInput } from "@/lib/bunny/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

function activeEditor(account: Awaited<ReturnType<typeof loadRealAccountState>>): boolean {
  return Boolean(account.user && !account.accessLoadFailed && !account.accountBlocked
    && (account.roles.includes("content_manager") || account.roles.includes("admin")));
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return response({ error: "invalid_origin" }, 403);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength > 16_384) return response({ error: "request_too_large" }, 413);
  const account = await loadRealAccountState();
  if (!activeEditor(account)) return response({ error: "active_content_editor_required" }, 403);

  let input: unknown;
  try { input = await request.json(); } catch { return response({ error: "invalid_request" }, 400); }
  if (!validBunnyUploadInput(input) || input.title.trim().length > 120) return response({ error: "invalid_video_upload" }, 400);
  const category = typeof (input as Record<string, unknown>).category === "string" ? String((input as Record<string, unknown>).category).trim() : "";
  if (category.length > 60 || /[\p{Cc}\p{Cf}]/u.test(category)) return response({ error: "invalid_category" }, 400);

  let providerVideoId: string | null = null;
  try {
    providerVideoId = await createBunnyVideo(input.title.trim());
    const supabase = await createServerSupabaseClient();
    const { data: publicVideoId, error } = await supabase.rpc("content_create_public_bunny_video", {
      p_provider_video_id: providerVideoId,
      p_title: input.title.trim(),
      p_short_description: input.description.trim(),
      p_category: category,
      p_file_name: input.fileName.trim(),
      p_file_size: input.fileSize,
      p_mime_type: input.mimeType,
    });
    if (error) {
      await deleteBunnyVideo(providerVideoId);
      return response({ error: "video_record_failed" }, 500);
    }
    return response({ ...createBunnyTusCredentials(providerVideoId), publicVideoId }, 201);
  } catch {
    if (providerVideoId) await deleteBunnyVideo(providerVideoId).catch(() => false);
    return response({ error: "bunny_unavailable" }, 503);
  }
}
