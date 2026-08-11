import { NextResponse } from "next/server";

import { createSignedBunnyHlsPlayback, createSignedBunnyPoster } from "@/lib/bunny/server";
import { validBunnyUuid } from "@/lib/bunny/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function unavailable(status = 404) {
  return new NextResponse(null, { status, headers: { "Cache-Control": "public, no-store, max-age=0", "X-Robots-Tag": "noindex" } });
}

export async function GET(request: Request, context: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await context.params;
  if (!validBunnyUuid(videoId)) return unavailable();
  const asset = new URL(request.url).searchParams.get("asset");
  if (asset && asset !== "poster") return unavailable();
  try {
    const admin = createAdminSupabaseClient();
    const { data: providerVideoId, error } = await admin.rpc("resolve_public_bunny_video", { p_video_id: videoId, p_allow_draft: false });
    if (error || !providerVideoId) return unavailable();
    if (asset === "poster") {
      return NextResponse.redirect(await createSignedBunnyPoster(providerVideoId), {
        status: 307,
        headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60", "X-Robots-Tag": "noindex" },
      });
    }
    return NextResponse.json(createSignedBunnyHlsPlayback(providerVideoId), {
      headers: { "Cache-Control": "public, no-store, max-age=0", "X-Robots-Tag": "noindex" },
    });
  } catch {
    return unavailable(503);
  }
}
