"use server";

import { getSiteOrigin } from "@/lib/auth/redirects";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/validation/auth-credentials";

export type ForgotPasswordState = { submitted: boolean; message: string };

const neutralMessage = "If an account exists for that email address, a password reset message has been sent.";

export async function requestPasswordResetAction(_previous: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const email = normalizeEmail(formData.get("email"));
  if (!email || !isSupabaseConfigured()) return { submitted: true, message: neutralMessage };

  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteOrigin()}/auth/recovery`,
    });
  } catch {
    // Enumeration-safe response: provider and configuration details stay private.
  }
  return { submitted: true, message: neutralMessage };
}
