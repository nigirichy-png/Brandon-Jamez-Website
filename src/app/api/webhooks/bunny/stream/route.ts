import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireBunnyStreamConfig } from "@/lib/bunny/config";
import { mapBunnyProviderStatus, type BunnyWebhookPayload } from "@/lib/bunny/model";
import { verifyBunnyWebhook } from "@/lib/bunny/server";
import { validBunnyUuid } from "@/lib/bunny/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength > 16_384) return new NextResponse(null, { status: 413 });
  let rawBody: string;
  try { rawBody = await request.text(); } catch { return new NextResponse(null, { status: 400 }); }
  if (rawBody.length > 16_384) return new NextResponse(null, { status: 413 });
  try { if (!verifyBunnyWebhook(rawBody, request.headers)) return new NextResponse(null, { status: 401 }); } catch { return new NextResponse(null, { status: 503 }); }

  let payload: BunnyWebhookPayload;
  try { payload = JSON.parse(rawBody) as BunnyWebhookPayload; } catch { return new NextResponse(null, { status: 400 }); }
  const config = requireBunnyStreamConfig();
  const status = mapBunnyProviderStatus(payload.Status);
  if (String(payload.VideoLibraryId) !== config.libraryId || !validBunnyUuid(payload.VideoGuid) || !status) return new NextResponse(null, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { error } = await admin.rpc("service_update_subscriber_bunny_video_status", {
    p_provider_video_id: payload.VideoGuid,
    p_status: status,
    p_provider_status: payload.Status,
  });
  if (error) return NextResponse.json({ error: "webhook_update_failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  revalidatePath("/subscriber");
  revalidatePath("/admin/subscriber-content");
  return new NextResponse(null, { status: 204 });
}
