import "server-only";

import { redirect } from "next/navigation";

import { loadRealAccountState } from "@/lib/auth/access-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ModerationCase, ModerationCaseHistory } from "./model";

export async function requireRealModerator(nextPath: string) {
  const state = await loadRealAccountState();
  if (!state.user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  const allowed = !state.accessLoadFailed
    && !state.accountBlocked
    && (state.roles.includes("moderator") || state.roles.includes("admin"));
  return { state, allowed } as const;
}

export async function listModerationCases(): Promise<ModerationCase[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("moderator_list_cases");
  if (error) throw new Error("moderation_cases_unavailable");
  return (data ?? []) as ModerationCase[];
}

export async function listModerationCaseHistory(): Promise<ModerationCaseHistory[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("moderator_list_case_history");
  if (error) throw new Error("moderation_history_unavailable");
  return (data ?? []) as ModerationCaseHistory[];
}
