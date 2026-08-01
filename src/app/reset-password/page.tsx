import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { isValidRecoveryMarker, recoveryCookieName } from "@/lib/auth/recovery-marker";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reset Password" };

export default async function ResetPasswordPage() {
  let recoveryValid = false;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const [{ data, error }, cookieStore] = await Promise.all([supabase.auth.getUser(), cookies()]);
      recoveryValid = !error && Boolean(data.user && isValidRecoveryMarker(cookieStore.get(recoveryCookieName)?.value, data.user.id));
    } catch {
      recoveryValid = false;
    }
  }
  return <AuthShell eyebrow="Secure password recovery" title="Choose a new password." description="A valid, short-lived recovery session is required before a password can be changed."><ResetPasswordForm recoveryValid={recoveryValid} /></AuthShell>;
}
