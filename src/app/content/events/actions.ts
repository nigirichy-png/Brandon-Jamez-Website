"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/admin/validation";
import { requireRealContentEditor } from "@/lib/content/access";
import { cmsEventErrorMessage, parseCmsEventInput } from "@/lib/events/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CmsEventActionState = { tone: "idle" | "success" | "error"; message: string };

const validVersion = (input: string) => input.length <= 64 && Number.isFinite(Date.parse(input));
async function authorize(): Promise<CmsEventActionState | null> {
  const authorization = await requireRealContentEditor("/content/events");
  return authorization.allowed ? null : { tone: "error", message: "An active content manager or administrator account is required." };
}
function refreshEventPaths() {
  revalidatePath("/events");
  revalidatePath("/content");
  revalidatePath("/content/events");
  revalidatePath("/admin/content");
  revalidatePath("/admin/audit");
}

export async function createCmsEventAction(_previous: CmsEventActionState, formData: FormData): Promise<CmsEventActionState> {
  const denied = await authorize(); if (denied) return denied;
  const input = parseCmsEventInput(formData); if (!input.ok) return { tone: "error", message: input.message };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("content_create_cms_event", { p_title: input.value.title, p_description: input.value.description, p_location: input.value.location, p_starts_at: input.value.startsAt });
  if (error) return { tone: "error", message: cmsEventErrorMessage(error.message) };
  refreshEventPaths(); return { tone: "success", message: "Draft event created." };
}

export async function updateCmsEventAction(eventId: string, expectedUpdatedAt: string, _previous: CmsEventActionState, formData: FormData): Promise<CmsEventActionState> {
  if (!isUuid(eventId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The event reference is invalid. Refresh the page." };
  const denied = await authorize(); if (denied) return denied;
  const input = parseCmsEventInput(formData); if (!input.ok) return { tone: "error", message: input.message };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("content_update_cms_event", { p_event_id: eventId, p_expected_updated_at: expectedUpdatedAt, p_title: input.value.title, p_description: input.value.description, p_location: input.value.location, p_starts_at: input.value.startsAt });
  if (error) return { tone: "error", message: cmsEventErrorMessage(error.message) };
  refreshEventPaths(); return { tone: "success", message: data ? "Event updated." : "No event details changed." };
}

export async function setCmsEventPublicationAction(eventId: string, expectedUpdatedAt: string, publish: boolean, _previous: CmsEventActionState, _formData: FormData): Promise<CmsEventActionState> {
  void _previous; void _formData;
  if (!isUuid(eventId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The event reference is invalid. Refresh the page." };
  const denied = await authorize(); if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("content_set_cms_event_publication", { p_event_id: eventId, p_expected_updated_at: expectedUpdatedAt, p_publish: publish });
  if (error) return { tone: "error", message: cmsEventErrorMessage(error.message) };
  refreshEventPaths(); return { tone: "success", message: data ? (publish ? "Event published." : "Event returned to draft.") : "Publication state was already current." };
}

export async function setCmsEventArchivedAction(eventId: string, expectedUpdatedAt: string, archive: boolean, _previous: CmsEventActionState, _formData: FormData): Promise<CmsEventActionState> {
  void _previous; void _formData;
  if (!isUuid(eventId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The event reference is invalid. Refresh the page." };
  const denied = await authorize(); if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("content_set_cms_event_archived", { p_event_id: eventId, p_expected_updated_at: expectedUpdatedAt, p_archive: archive });
  if (error) return { tone: "error", message: cmsEventErrorMessage(error.message) };
  refreshEventPaths(); return { tone: "success", message: data ? (archive ? "Event archived." : "Event restored as draft.") : "Archive state was already current." };
}

export async function deleteCmsEventAction(eventId: string, expectedUpdatedAt: string, _previous: CmsEventActionState, _formData: FormData): Promise<CmsEventActionState> {
  void _previous; void _formData;
  if (!isUuid(eventId) || !validVersion(expectedUpdatedAt)) return { tone: "error", message: "The event reference is invalid. Refresh the page." };
  const denied = await authorize(); if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("content_delete_cms_event", { p_event_id: eventId, p_expected_updated_at: expectedUpdatedAt });
  if (error) return { tone: "error", message: cmsEventErrorMessage(error.message) };
  refreshEventPaths(); return { tone: "success", message: "Archived event deleted; its audit reference remains." };
}
