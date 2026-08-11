import { revalidatePath, revalidateTag } from "next/cache";
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
  const rpcInput = { p_provider_video_id: payload.VideoGuid, p_status: status, p_provider_status: payload.Status };
  const [subscriberUpdate, publicUpdate] = await Promise.all([
    admin.rpc("service_update_subscriber_bunny_video_status", rpcInput),
    admin.rpc("service_update_public_bunny_video_status", rpcInput),
  ]);
  if (subscriberUpdate.error || publicUpdate.error) return NextResponse.json({ error: "webhook_update_failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  revalidateTag("published-public-bunny-videos", "max");
  revalidatePath("/subscriber");
  revalidatePath("/admin/subscriber-content");
  revalidatePath("/videos");
  revalidatePath("/content/videos");
  revalidatePath("/admin/content/videos");
  return new NextResponse(null, { status: 204 });
}
