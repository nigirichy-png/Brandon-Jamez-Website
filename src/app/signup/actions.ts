"use server";

import { redirect } from "next/navigation";

import { getSiteOrigin } from "@/lib/auth/redirects";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/;

export async function signupAction(formData: FormData) {
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")).trim() : "";
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  const confirmation = typeof formData.get("passwordConfirmation") === "string" ? String(formData.get("passwordConfirmation")) : "";

  if (!emailPattern.test(email) || email.length > 254) redirect("/signup?error=invalid_email");
  if (!strongPassword.test(password)) redirect("/signup?error=weak_password");
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
