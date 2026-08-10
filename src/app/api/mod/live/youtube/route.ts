import { NextResponse } from "next/server";
import { loadRealAccountState } from "@/lib/auth/access-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getYouTubeChat, moderateYouTubeChat, releaseYouTubeChat } from "@/lib/youtube-live/gateway";
import type { YouTubeModerationInput } from "@/lib/youtube-live/model";

export const dynamic = "force-dynamic";
async function authorization() { const state = await loadRealAccountState(); return { allowed: Boolean(state.user && !state.accessLoadFailed && !state.accountBlocked && (state.roles.includes("moderator") || state.roles.includes("admin"))), admin: state.roles.includes("admin"), actorId: state.user?.id ?? null }; }
function failure(error: unknown) { const message = error instanceof Error ? error.message : "youtube_request_failed"; return NextResponse.json({ error: message }, { status: message.includes("not_configured") ? 503 : 502 }); }

export async function GET(request: Request) { const access = await authorization(); if (!access.allowed || !access.actorId) return NextResponse.json({ error: "active_moderator_required" }, { status: 403 }); const url = new URL(request.url); try { return NextResponse.json(await getYouTubeChat(access.actorId, url.searchParams.get("videoId") ?? "", url.searchParams.get("manualRetry") === "true")); } catch (error) { return failure(error); } }

export async function POST(request: Request) {
  const access = await authorization(); if (!access.allowed) return NextResponse.json({ error: "active_moderator_required" }, { status: 403 });
  try {
    if (!access.actorId) return NextResponse.json({ error: "active_moderator_required" }, { status: 403 });
    const input = await request.json() as YouTubeModerationInput;
    if (input.action === "send" && !access.admin) return NextResponse.json({ error: "active_admin_required" }, { status: 403 });
    const chat = await moderateYouTubeChat(access.actorId, input); const actions = { delete: "youtube.chat_message_deleted", timeout: "youtube.chat_user_timed_out", hide: "youtube.chat_user_hidden", send: "youtube.chat_message_sent" } as const;
    const supabase = await createServerSupabaseClient(); const { error } = await supabase.rpc("record_youtube_moderation_action", { p_action: actions[input.action], p_live_chat_id: chat.liveChatId, p_target_label: input.channelId ?? input.messageId ?? chat.title, p_metadata: { video_id: input.videoId, message_id: input.messageId ?? null, channel_id: input.channelId ?? null, duration_seconds: input.durationSeconds ?? null } }); if (error) throw new Error("youtube_audit_failed");
    return NextResponse.json({ ok: true });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  const access = await authorization(); if (!access.allowed || !access.actorId) return NextResponse.json({ error: "active_moderator_required" }, { status: 403 });
  try { const liveChatId = new URL(request.url).searchParams.get("liveChatId") ?? ""; await releaseYouTubeChat(access.actorId, liveChatId); return new Response(null, { status: 204 }); } catch (error) { return failure(error); }
}
