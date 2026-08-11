import "server-only";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import type { EditorSnapshot } from "@/components/home/homepage-editor-model";
import { usesUnconfiguredDevelopmentEditor } from "@/lib/site-content/development-access";
import { homepageRouteKey, sanitizeHomepageDocument } from "@/lib/site-content/homepage-document";
import { isSupabaseConfigured, requirePublicSupabaseConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const publishedHomepageCacheTag = "published-site-page-home";

export type StoredDocument = { snapshot: EditorSnapshot; version: number };
export type EditorDocuments = {
  published: StoredDocument | null;
  draft: StoredDocument | null;
};

type StoredRow = { document: unknown; schema_version: number; version: number };
type AdminRow = StoredRow & { state: "draft" | "published" };

/**
 * Development-only local store.
 *
 * The hosted project keeps every document in Postgres behind RLS. This file
 * fallback exists so the editor is drivable before Supabase is connected, and
 * it is deliberately unreachable in production: `usesLocalStore()` requires an
 * unconfigured Supabase *and* a non-production build, so a deployment that
 * loses its environment variables fails closed to the shipped defaults instead
 * of silently serving writable local content.
 */
const localStorePath = ".local/site-content.json";

const usesLocalStore = usesUnconfiguredDevelopmentEditor;

type LocalFile = Record<string, { draft?: { document: unknown; version: number }; published?: { document: unknown; version: number } }>;

async function readLocalFile(): Promise<LocalFile> {
  const { readFile } = await import("node:fs/promises");
  try {
    const raw = await readFile(localStorePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed as LocalFile : {};
  } catch {
    return {};
  }
}

async function writeLocalFile(content: LocalFile): Promise<void> {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { dirname } = await import("node:path");
  await mkdir(dirname(localStorePath), { recursive: true });
  await writeFile(localStorePath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
}

const toStored = (row: { document: unknown; version: number } | null | undefined): StoredDocument | null =>
  row ? { snapshot: sanitizeHomepageDocument(row.document), version: row.version } : null;

/**
 * Public read path. Cached like the published video feed and invalidated by the
 * publish and discard actions, so an anonymous request never pays for a live
 * database round trip.
 */
const loadPublishedDocument = unstable_cache(async (): Promise<StoredDocument | null> => {
  const { url, anonKey } = requirePublicSupabaseConfig("the published homepage document");
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.rpc("get_published_site_page", { p_route_key: homepageRouteKey });
  if (error) throw new Error("published_site_page_unavailable");
  const row = (data as StoredRow[] | null)?.[0];
  return toStored(row);
}, ["published-site-page-home-v1"], { revalidate: 60, tags: [publishedHomepageCacheTag] });

/**
 * Never throws: a storage failure must not take the homepage down, so the page
 * falls back to the content shipped in the route component.
 */
export async function loadPublishedHomepageDocument(): Promise<StoredDocument | null> {
  try {
    if (usesLocalStore()) {
      const file = await readLocalFile();
      return toStored(file[homepageRouteKey]?.published ?? null);
    }
    if (!isSupabaseConfigured()) return null;
    return await loadPublishedDocument();
  } catch {
    return null;
  }
}

/** Draft and published rows for an authorized editor. The RPC repeats the admin check server-side. */
export async function loadHomepageEditorDocuments(): Promise<EditorDocuments> {
  try {
    if (usesLocalStore()) {
      const entry = (await readLocalFile())[homepageRouteKey];
      return { published: toStored(entry?.published ?? null), draft: toStored(entry?.draft ?? null) };
    }
    if (!isSupabaseConfigured()) return { published: null, draft: null };
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("admin_get_site_page", { p_route_key: homepageRouteKey });
    if (error) return { published: null, draft: null };
    const rows = (data as AdminRow[] | null) ?? [];
    return {
      published: toStored(rows.find((row) => row.state === "published") ?? null),
      draft: toStored(rows.find((row) => row.state === "draft") ?? null),
    };
  } catch {
    return { published: null, draft: null };
  }
}

export type WriteResult =
  | { ok: true; version: number }
  | { ok: false; reason: "stale" | "not_found" | "forbidden" | "unavailable" };

/** Maps the RPC error vocabulary onto a small, non-leaking result union. */
function toFailure(message: string | undefined): WriteResult {
  if (message?.includes("stale_site_page_version")) return { ok: false, reason: "stale" };
  if (message?.includes("site_page_draft_not_found")) return { ok: false, reason: "not_found" };
  if (message?.includes("active_admin_required")) return { ok: false, reason: "forbidden" };
  return { ok: false, reason: "unavailable" };
}

export async function saveHomepageDraft(snapshot: EditorSnapshot, expectedVersion: number): Promise<WriteResult> {
  if (usesLocalStore()) {
    const file = await readLocalFile();
    const entry = file[homepageRouteKey] ?? {};
    const current = entry.draft?.version ?? 0;
    if (current !== expectedVersion) return { ok: false, reason: "stale" };
    const version = current + 1;
    file[homepageRouteKey] = { ...entry, draft: { document: snapshot, version } };
    await writeLocalFile(file);
    return { ok: true, version };
  }
  if (!isSupabaseConfigured()) return { ok: false, reason: "unavailable" };
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("admin_save_site_page_draft", {
      p_route_key: homepageRouteKey,
      p_schema_version: snapshot.schemaVersion,
      p_document: snapshot as unknown as Json,
      p_expected_version: expectedVersion,
    });
    if (error) return toFailure(error.message);
    return { ok: true, version: data as number };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export async function publishHomepageDraft(expectedVersion: number): Promise<WriteResult> {
  if (usesLocalStore()) {
    const file = await readLocalFile();
    const entry = file[homepageRouteKey] ?? {};
    if (!entry.draft) return { ok: false, reason: "not_found" };
    if (entry.draft.version !== expectedVersion) return { ok: false, reason: "stale" };
    const version = (entry.published?.version ?? 0) + 1;
    file[homepageRouteKey] = { ...entry, published: { document: entry.draft.document, version } };
    await writeLocalFile(file);
    return { ok: true, version };
  }
  if (!isSupabaseConfigured()) return { ok: false, reason: "unavailable" };
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("admin_publish_site_page", {
      p_route_key: homepageRouteKey,
      p_expected_version: expectedVersion,
    });
    if (error) return toFailure(error.message);
    return { ok: true, version: data as number };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

/** Removes the draft only. Published content is intentionally left untouched. */
export async function discardHomepageDraft(): Promise<WriteResult> {
  if (usesLocalStore()) {
    const file = await readLocalFile();
    const entry = file[homepageRouteKey];
    if (!entry?.draft) return { ok: false, reason: "not_found" };
    file[homepageRouteKey] = { published: entry.published };
    await writeLocalFile(file);
    return { ok: true, version: 0 };
  }
  if (!isSupabaseConfigured()) return { ok: false, reason: "unavailable" };
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("admin_discard_site_page_draft", { p_route_key: homepageRouteKey });
    if (error) return toFailure(error.message);
    return data === true ? { ok: true, version: 0 } : { ok: false, reason: "not_found" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
