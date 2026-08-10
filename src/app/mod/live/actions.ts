"use server";

import { revalidatePath } from "next/cache";

import { requireRealModerator } from "@/lib/moderation/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isLiveStatus, parseLiveConfiguration } from "@/lib/live/validation";

export type LiveActionState = { tone: "idle" | "success" | "error"; message: string };

async function authorize(adminOnly = false): Promise<LiveActionState | null> {
  const authorization = await requireRealModerator("/mod/live");
  if (!authorization.allowed) return { tone: "error", message: "An active moderator or administrator account is required." };
  if (adminOnly && !authorization.state.roles.includes("admin")) return { tone: "error", message: "Only an active administrator may configure the stream." };
  return null;
}

function refresh() { revalidatePath("/live"); revalidatePath("/mod/live"); revalidatePath("/admin/audit"); }

export async function configureLiveAction(sessionId: string | null, expectedUpdatedAt: string | null, _state: LiveActionState, formData: FormData): Promise<LiveActionState> {
  const denied = await authorize(true); if (denied) return denied;
  const input = parseLiveConfiguration(formData); if (!input.ok) return { tone: "error", message: input.message };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_configure_live_session", { p_session_id: sessionId, p_expected_updated_at: expectedUpdatedAt, p_title: input.value.title, p_source: input.value.source, p_youtube_video_id: input.value.youtubeVideoId, p_direct_provider: input.value.directPlaybackProvider, p_direct_reference: input.value.directPlaybackReference });
  if (error) return { tone: "error", message: error.message.includes("stale") ? "The live configuration changed. Refresh and try again." : "The live configuration could not be saved." };
  refresh(); return { tone: "success", message: "Live configuration saved." };
}

export async function setLiveStatusAction(sessionId: string, expectedUpdatedAt: string, _state: LiveActionState, formData: FormData): Promise<LiveActionState> {
  const denied = await authorize(true); if (denied) return denied;
  const status = String(formData.get("status") ?? ""); if (!isLiveStatus(status)) return { tone: "error", message: "Choose a valid live status." };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_set_live_status", { p_session_id: sessionId, p_expected_updated_at: expectedUpdatedAt, p_status: status });
  if (error) return { tone: "error", message: error.message.includes("stale") ? "The live status changed. Refresh and try again." : "The live status could not be changed." };
  refresh(); return { tone: "success", message: "Live status changed." };
}

export async function deleteLiveMessageAction(messageId: number, _state: LiveActionState, _formData: FormData): Promise<LiveActionState> {
  void _state; void _formData;
  const denied = await authorize(); if (denied) return denied;
  const supabase = await createServerSupabaseClient(); const { error } = await supabase.rpc("moderator_delete_live_chat_message", { p_message_id: messageId });
  if (error) return { tone: "error", message: "The chat message could not be removed." }; refresh(); return { tone: "success", message: "Chat message removed and audited." };
}

export async function restrictLiveUserAction(sessionId: string, authorKey: string, _state: LiveActionState, formData: FormData): Promise<LiveActionState> {
  const denied = await authorize(); if (denied) return denied;
  const kind = String(formData.get("kind") ?? ""); const duration = kind === "timeout" ? Number(formData.get("duration")) : null;
  const supabase = await createServerSupabaseClient(); const { error } = await supabase.rpc("moderator_restrict_live_chat_user", { p_session_id: sessionId, p_author_key: authorKey, p_kind: kind, p_duration_seconds: duration });
  if (error) return { tone: "error", message: error.message.includes("protected") ? "Staff accounts cannot be restricted here." : "The chat restriction could not be applied." }; refresh(); return { tone: "success", message: "Chat restriction applied and audited." };
}
