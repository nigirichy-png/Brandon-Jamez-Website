"use server";

import { revalidatePath, updateTag } from "next/cache";

import { loadRealAccountState } from "@/lib/auth/access-state";
import { usesUnconfiguredDevelopmentEditor } from "@/lib/site-content/development-access";
import { homepageDocumentExceedsLimit, sanitizeHomepageDocument } from "@/lib/site-content/homepage-document";
import { discardHomepageDraft, publishHomepageDraft, publishedHomepageCacheTag, saveHomepageDraft } from "@/lib/site-content/store";

export type SiteContentResult =
  | { status: "saved"; version: number }
  | { status: "published"; version: number }
  | { status: "discarded" }
  | { status: "error"; reason: "forbidden" | "stale" | "not_found" | "invalid" | "unavailable" };

/**
 * Browser visibility is never authorization. Every action re-validates the
 * Supabase user and the admin role here, and the database RPCs repeat the same
 * check under RLS, so a forged request reaches neither the store nor the page.
 */
async function requireActiveAdmin(): Promise<boolean> {
  // Only ever true for an unconfigured development checkout, where the store is
  // the Git-ignored local file rather than a database row.
  if (usesUnconfiguredDevelopmentEditor()) return true;
  const state = await loadRealAccountState();
  return Boolean(state.user) && !state.accountBlocked && !state.accessLoadFailed && state.roles.includes("admin");
}

/**
 * Publishing changes what anonymous visitors see, so both the cached RPC read
 * and the rendered route are invalidated. `updateTag` rather than
 * `revalidateTag`: it expires immediately inside a Server Action, so the editor
 * sees its own publish on the very next render instead of a stale document.
 */
function revalidateHomepage(): void {
  updateTag(publishedHomepageCacheTag);
  revalidatePath("/", "page");
}

export async function saveHomepageDraftAction(document: unknown, expectedVersion: number): Promise<SiteContentResult> {
  if (!await requireActiveAdmin()) return { status: "error", reason: "forbidden" };
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) return { status: "error", reason: "invalid" };

  // The client is untrusted even when the account is: rebuild the snapshot from
  // scratch and store only what the sanitizer recognizes.
  const snapshot = sanitizeHomepageDocument(document);
  if (homepageDocumentExceedsLimit(snapshot)) return { status: "error", reason: "invalid" };

  const result = await saveHomepageDraft(snapshot, expectedVersion);
  if (!result.ok) return { status: "error", reason: result.reason };
  return { status: "saved", version: result.version };
}

export async function publishHomepageDraftAction(expectedVersion: number): Promise<SiteContentResult> {
  if (!await requireActiveAdmin()) return { status: "error", reason: "forbidden" };
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) return { status: "error", reason: "invalid" };

  const result = await publishHomepageDraft(expectedVersion);
  if (!result.ok) return { status: "error", reason: result.reason };
  revalidateHomepage();
  return { status: "published", version: result.version };
}

export async function discardHomepageDraftAction(): Promise<SiteContentResult> {
  if (!await requireActiveAdmin()) return { status: "error", reason: "forbidden" };

  const result = await discardHomepageDraft();
  if (!result.ok) return { status: "error", reason: result.reason };
  revalidateHomepage();
  return { status: "discarded" };
}
