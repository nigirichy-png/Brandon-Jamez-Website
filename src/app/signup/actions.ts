"use server";

import { redirect } from "next/navigation";

import { getSiteOrigin } from "@/lib/auth/redirects";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isStrongPassword, normalizeEmail } from "@/lib/validation/auth-credentials";

export async function signupAction(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  const confirmation = typeof formData.get("passwordConfirmation") === "string" ? String(formData.get("passwordConfirmation")) : "";

  if (!email) redirect("/signup?error=invalid_email");
  if (!isStrongPassword(password)) redirect("/signup?error=weak_password");
  if (password !== confirmation) redirect("/signup?error=password_mismatch");
  if (!isSupabaseConfigured()) redirect("/signup?error=not_configured");

  let failed = false;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${getSiteOrigin()}/auth/confirm` } });
    failed = Boolean(error);
  } catch {
    failed = true;
  }
  if (failed) redirect("/signup?error=signup_failed");
  redirect("/signup?status=check_email");
}
