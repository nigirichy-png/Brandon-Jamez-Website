"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getSafeNextPath } from "@/lib/auth/redirects";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function loginAction(formData: FormData) {
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")).trim() : "";
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  const next = getSafeNextPath(formData.get("next"));
  const nextQuery = `&next=${encodeURIComponent(next)}`;

  if (!emailPattern.test(email) || email.length > 254 || !password || password.length > 128) redirect(`/login?error=invalid_credentials${nextQuery}`);
  if (!isSupabaseConfigured()) redirect(`/login?error=not_configured${nextQuery}`);

  let failed = false;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    failed = Boolean(error);
  } catch {
    failed = true;
  }
  if (failed) redirect(`/login?error=invalid_credentials${nextQuery}`);
  revalidatePath("/", "layout");
  redirect(next);
}
