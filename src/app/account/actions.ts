"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeDisplayName } from "@/lib/validation/display-name";

export type DisplayNameActionState = { status: "idle" | "success" | "error"; message: string };

export async function updateDisplayNameAction(_previous: DisplayNameActionState, formData: FormData): Promise<DisplayNameActionState> {
  const displayName = normalizeDisplayName(formData.get("displayName"));
  if (!displayName) {
    return { status: "error", message: "Enter 2–50 letters, numbers, spaces, hyphens, or apostrophes." };
  }
  try {
    const supabase = await createServerSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return { status: "error", message: "Please sign in again before updating your profile." };
    const { data, error } = await supabase.rpc("update_own_display_name", { p_display_name: displayName });
    if (error || data !== true) return { status: "error", message: "The display name could not be updated. Please try again." };
    revalidatePath("/account");
    revalidatePath("/admin");
    return { status: "success", message: "Display name updated." };
  } catch {
    return { status: "error", message: "The display name could not be updated. Please try again." };
  }
}

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
