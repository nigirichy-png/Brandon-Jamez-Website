import { NextResponse } from "next/server";

import { loadRealAccountState, resolveMemberAccessState } from "@/lib/auth/access-state";
import { createSignedBunnyHlsPlayback, createSignedBunnyPoster } from "@/lib/bunny/server";
import { evaluateMemberAccess } from "@/lib/entitlements/evaluate-member-access";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { listAdminSubscriberVideos, listPublishedSubscriberVideos } from "@/lib/subscriber-content/data";

export const dynamic = "force-dynamic";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function unavailable(status = 404) {
  return new NextResponse(null, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow, noarchive", Vary: "Cookie" } });
}

async function authorizedVideo(slug: string, adminPreview: boolean) {
  if (adminPreview) {
    const state = await loadRealAccountState();
    if (!state.user || state.accessLoadFailed || state.accountBlocked || !state.roles.includes("admin")) return null;
    return (await listAdminSubscriberVideos()).find((item) => item.slug === slug) ?? null;
  }
  const state = await resolveMemberAccessState(undefined);
  if (!evaluateMemberAccess(state).allowed) return null;
  return (await listPublishedSubscriberVideos()).find((item) => item.slug === slug) ?? null;
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!slugPattern.test(slug) || slug.length > 100) return unavailable();
  const searchParams = new URL(request.url).searchParams;
  const preview = searchParams.get("preview");
  const asset = searchParams.get("asset");
  if (preview && preview !== "admin") return unavailable();
  if (asset && asset !== "poster") return unavailable();
  try {
    const video = await authorizedVideo(slug, preview === "admin");
    if (!video) return unavailable();
    const admin = createAdminSupabaseClient();
    const { data: providerVideoId, error } = await admin.rpc("resolve_subscriber_bunny_video", { p_video_id: video.id, p_slug: slug, p_allow_draft: preview === "admin" });
    if (error || !providerVideoId) return unavailable();
    if (asset === "poster") return NextResponse.redirect(await createSignedBunnyPoster(providerVideoId), { status: 307, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow, noarchive", Vary: "Cookie" } });
    const playback = createSignedBunnyHlsPlayback(providerVideoId);
    return NextResponse.json(playback, {
      headers: { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow, noarchive", Vary: "Cookie" },
    });
  } catch { return unavailable(503); }
}
