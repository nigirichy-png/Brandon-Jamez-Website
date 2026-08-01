import "server-only";

import type { User } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("A validated authenticated user is required for this server operation.");
    this.name = "AuthenticationRequiredError";
  }
}

/** Returns a fresh, server-confirmed user or null in mock/unconfigured mode. */
export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) return null;
  return data.user;
}

/** Prepared for future server entry points; not applied to placeholder routes. */
export async function requireAuthenticatedUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationRequiredError();
  return user;
}
