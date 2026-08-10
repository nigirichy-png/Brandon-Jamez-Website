import { NextResponse } from "next/server";
import { getCurrentLiveSession } from "@/lib/live/data";
import { isPublicModerationHubPreviewEnabled } from "@/lib/live/moderation-hub-preview";
import { getYouTubeChat } from "@/lib/youtube-live/gateway";

export const dynamic = "force-dynamic";
const PUBLIC_PREVIEW_ACTOR = "00000000-0000-4000-8000-000000000001";

async function validatedLiveChat(request: Request) {
  if (!isPublicModerationHubPreviewEnabled()) return { error: "preview_not_available", status: 404 } as const;
  const session = await getCurrentLiveSession().catch(() => null);
  const videoId = new URL(request.url).searchParams.get("videoId") ?? "";
  if (!session || session.source !== "youtube" || !session.youtubeVideoId || session.youtubeVideoId !== videoId) return { error: "active_preview_stream_required", status: 404 } as const;
  return { session, videoId } as const;
}

export async function GET(request: Request) {
  const validation = await validatedLiveChat(request);
  if ("error" in validation) return NextResponse.json({ error: validation.error }, { status: validation.status });
  try {
    const manualRetry = new URL(request.url).searchParams.get("manualRetry") === "true";
    return NextResponse.json(await getYouTubeChat(PUBLIC_PREVIEW_ACTOR, validation.videoId, manualRetry));
  } catch {
    return NextResponse.json({ error: "youtube_preview_unavailable" }, { status: 502 });
  }
}
