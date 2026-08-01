"use client";

import { createBrowserClient } from "@supabase/ssr";

import { requirePublicSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/types";

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let browserClient: BrowserClient | undefined;

/** Lazily creates a public browser client. Never uses server-only credentials. */
export function createBrowserSupabaseClient(): BrowserClient {
  const { url, anonKey } = requirePublicSupabaseConfig("the browser client");

  browserClient ??= createBrowserClient<Database>(url, anonKey);
  return browserClient;
}
