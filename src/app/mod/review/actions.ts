"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/admin/validation";
import { requireRealModerator } from "@/lib/moderation/data";
import { moderationErrorMessage, parseModerationCaseInput, parseModerationStatus } from "@/lib/moderation/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ModerationActionState = { tone: "idle" | "success" | "error"; message: string };

function validVersion(value: string): boolean {
  return value.length <= 64 && Number.isFinite(Date.parse(value));
}

async function authorize(requireAdmin = false): Promise<ModerationActionState | null> {
  const authorization = await requireRealModerator("/mod/review");
  if (!authorization.allowed) return { tone: "error", message: "An active moderator or administrator account is required." };
  if (requireAdmin && !authorization.state.roles.includes("admin")) return { tone: "error", message: "An active administrator account is required for this action." };
  return null;
}

function refreshModerationPaths() {
  revalidatePath("/mod");
  revalidatePath("/mod/review");
  revalidatePath("/admin/audit");
}

export async function createModerationCaseAction(_previous: ModerationActionState, formData: FormData): Promise<ModerationActionState> {
  const denied = await authorize();
  if (denied) return denied;
  const input = parseModerationCaseInput(formData);
  if (!input.ok) return { tone: "error", message: input.message };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("moderator_create_case", {
    p_title: input.value.title,
    p_source_type: input.value.sourceType,
    p_category: input.value.category,
    p_severity: input.value.severity,
    p_summary: input.value.summary,
    p_evidence_reference: input.value.evidenceReference,
  });
  if (error) return { tone: "error", message: moderationErrorMessage(error.message) };
  refreshModerationPaths();
  return { tone: "success", message: "Moderation case created." };
}

export async function updateModerationCaseAction(caseId: string, expectedUpdatedAt: string, _previous: ModerationActionState, formData: FormData): Promise<ModerationActionState> {
  if (!isUuid(caseId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The case reference is invalid. Refresh the page." };
  const denied = await authorize();
  if (denied) return denied;
  const input = parseModerationCaseInput(formData);
  if (!input.ok) return { tone: "error", message: input.message };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("moderator_update_case", {
    p_case_id: caseId,
    p_expected_updated_at: expectedUpdatedAt,
    p_title: input.value.title,
    p_source_type: input.value.sourceType,
    p_category: input.value.category,
    p_severity: input.value.severity,
    p_summary: input.value.summary,
    p_evidence_reference: input.value.evidenceReference,
  });
  if (error) return { tone: "error", message: moderationErrorMessage(error.message) };
  refreshModerationPaths();
  return { tone: "success", message: data ? "Case details updated." : "No case details changed." };
}

export async function setModerationAssignmentAction(caseId: string, expectedUpdatedAt: string, assignToSelf: boolean, _previous: ModerationActionState, _formData: FormData): Promise<ModerationActionState> {
  void _previous;
  void _formData;
  if (!isUuid(caseId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The case reference is invalid. Refresh the page." };
  const denied = await authorize();
  if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("moderator_set_case_assignment", {
    p_case_id: caseId,
    p_expected_updated_at: expectedUpdatedAt,
    p_assign_to_self: assignToSelf,
  });
  if (error) return { tone: "error", message: moderationErrorMessage(error.message) };
  refreshModerationPaths();
  return { tone: "success", message: data ? (assignToSelf ? "Case assigned to you." : "Case assignment released.") : "Assignment was already current." };
}

export async function setModerationStatusAction(caseId: string, expectedUpdatedAt: string, _previous: ModerationActionState, formData: FormData): Promise<ModerationActionState> {
  if (!isUuid(caseId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The case reference is invalid. Refresh the page." };
  const denied = await authorize();
  if (denied) return denied;
  const input = parseModerationStatus(formData);
  if (!input) return { tone: "error", message: "Choose a valid status and keep the note within 500 characters." };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("moderator_set_case_status", {
    p_case_id: caseId,
    p_expected_updated_at: expectedUpdatedAt,
    p_status: input.status,
    p_note: input.note,
  });
  if (error) return { tone: "error", message: moderationErrorMessage(error.message) };
  refreshModerationPaths();
  return { tone: "success", message: data ? "Case status updated and recorded in history." : "Status was already current." };
}

export async function deleteModerationCaseAction(caseId: string, expectedUpdatedAt: string, _previous: ModerationActionState, _formData: FormData): Promise<ModerationActionState> {
  void _previous;
  void _formData;
  if (!isUuid(caseId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The case reference is invalid. Refresh the page." };
  const denied = await authorize(true);
  if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("moderator_delete_case", {
    p_case_id: caseId,
    p_expected_updated_at: expectedUpdatedAt,
  });
  if (error) return { tone: "error", message: moderationErrorMessage(error.message) };
  refreshModerationPaths();
  return { tone: "success", message: "Archived moderation case permanently deleted; its audit reference remains." };
}
