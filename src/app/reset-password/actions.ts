"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { isValidRecoveryMarker, recoveryCookieName } from "@/lib/auth/recovery-marker";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isStrongPassword, passwordRequirements } from "@/lib/validation/auth-credentials";

export type ResetPasswordState = { status: "idle" | "error"; message: string };

export async function resetPasswordAction(
  _previous: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = formData.get("password");
  const confirmation = formData.get("passwordConfirmation");

  if (!isStrongPassword(password)) return { status: "error", message: passwordRequirements };
  if (password !== confirmation) return { status: "error", message: "The password confirmation does not match." };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    const cookieStore = await cookies();
    const marker = cookieStore.get(recoveryCookieName)?.value;
    if (error || !data.user || !isValidRecoveryMarker(marker, data.user.id)) {
      return { status: "error", message: "This recovery session is invalid or expired. Request a new recovery link." };
    }

    const result = await supabase.auth.updateUser({ password });
    if (result.error) return { status: "error", message: "The password could not be changed. Request a new recovery link and try again." };

    cookieStore.delete(recoveryCookieName);
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    return { status: "error", message: "The password could not be changed. Request a new recovery link and try again." };
  }

  revalidatePath("/", "layout");
  redirect("/login?status=password_reset");
}
