import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Development-only editor access for an unconfigured checkout.
 *
 * Both conditions are required and neither is under browser control:
 *
 * - `NODE_ENV !== "production"` — never true in a deployed build.
 * - `!isSupabaseConfigured()` — never true once real Supabase values exist, so
 *   a connected environment always falls back to the real admin role check.
 *
 * This is the same condition that selects the local file store, so development
 * access and development storage switch on together: it can only ever grant
 * editing over content that lives in the Git-ignored `.local` file, never over
 * a real database row. It follows the existing `?demo=` and `?staffDemo=`
 * convention of explicit, production-inert development previews.
 *
 * It is deliberately not wired into `/api/staff/builder-access`, which stays
 * the canonical role gate for every other page.
 */
export function usesUnconfiguredDevelopmentEditor(): boolean {
  return process.env.NODE_ENV !== "production" && !isSupabaseConfigured();
}
