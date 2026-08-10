import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LiveChatMessage, LiveSession } from "./model";

function mapSession(row: Awaited<ReturnType<typeof createServerSupabaseClient>> extends never ? never : Record<string, unknown>): LiveSession {
  return {
    id: String(row.id), title: String(row.title), source: row.source as LiveSession["source"], status: row.status as LiveSession["status"],
    youtubeVideoId: row.youtube_video_id as string | null, directPlaybackProvider: row.direct_playback_provider as string | null,
    directPlaybackReference: row.direct_playback_reference as string | null, updatedAt: String(row.updated_at),
  };
}

function mapMessage(row: { id: number; session_id: string; author_key: string; author_display_name: string; body: string; status: "visible" | "deleted"; created_at: string; updated_at: string }): LiveChatMessage {
  return { id: row.id, sessionId: row.session_id, authorKey: row.author_key, authorDisplayName: row.author_display_name, body: row.body, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function getCurrentLiveSession(): Promise<LiveSession | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_current_live_session");
  if (error) throw new Error("live_session_unavailable");
  return data?.[0] ? mapSession(data[0]) : null;
}

export async function listLiveChatMessages(sessionId: string): Promise<LiveChatMessage[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("list_live_chat_messages", { p_session_id: sessionId, p_limit: 100 });
  if (error) throw new Error("live_chat_unavailable");
  return (data ?? []).map(mapMessage).reverse();
}

