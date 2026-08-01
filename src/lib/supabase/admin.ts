import "server-only";

import { createClient } from "@supabase/supabase-js";

import { requireServiceRoleSupabaseConfig } from "@/lib/supabase/server-config";
import type { Database } from "@/lib/supabase/types";

/**
 * Lazily creates a trusted service-role client for narrowly scoped server jobs.
 * Service-role access bypasses RLS. Never import this module into client code,
 * and prefer a request user's RLS-bound client whenever possible.
 */
export function createAdminSupabaseClient() {
  const { url, serviceRoleKey } = requireServiceRoleSupabaseConfig();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
