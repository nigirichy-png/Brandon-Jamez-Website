"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // Redirect consistently without exposing provider errors.
    }
  }
  revalidatePath("/", "layout");
  redirect("/login?status=signed_out");
}
