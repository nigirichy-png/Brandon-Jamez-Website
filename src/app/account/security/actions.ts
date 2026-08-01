"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getSiteOrigin } from "@/lib/auth/redirects";
import { loadRealAccountState } from "@/lib/auth/access-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isStrongPassword, normalizeEmail, passwordRequirements } from "@/lib/validation/auth-credentials";

export type SecurityActionState = { status: "idle" | "success" | "error"; message: string };

async function requireUsableAccount() {
  const state = await loadRealAccountState();
  if (!state.user) redirect("/login?next=/account/security");
  if (state.accessLoadFailed || state.accountBlocked) return null;
  return state;
}

export async function changePasswordAction(
  _previous: SecurityActionState,
  formData: FormData,
): Promise<SecurityActionState> {
  const currentPassword = formData.get("currentPassword");
  const newPassword = formData.get("newPassword");
  const confirmation = formData.get("passwordConfirmation");
  if (typeof currentPassword !== "string" || !currentPassword || currentPassword.length > 128) return { status: "error", message: "The password could not be changed. Check your current password and try again." };
  if (!isStrongPassword(newPassword)) return { status: "error", message: passwordRequirements };
  if (newPassword !== confirmation) return { status: "error", message: "The password confirmation does not match." };

  try {
    if (!await requireUsableAccount()) return { status: "error", message: "Account security changes are unavailable for this account." };
    const supabase = await createServerSupabaseClient();
    const result = await supabase.auth.updateUser({ password: newPassword, current_password: currentPassword });
    if (result.error) return { status: "error", message: "The password could not be changed. Check your current password and try again." };
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    return { status: "error", message: "The password could not be changed. Check your current password and try again." };
  }

  revalidatePath("/", "layout");
  redirect("/login?status=password_changed");
}

export async function requestEmailChangeAction(
  _previous: SecurityActionState,
  formData: FormData,
): Promise<SecurityActionState> {
  const email = normalizeEmail(formData.get("newEmail"));
  if (!email) return { status: "error", message: "Enter a valid email address." };

  try {
    const account = await requireUsableAccount();
    if (!account?.user) return { status: "error", message: "Account security changes are unavailable for this account." };
    if (account.user.email?.toLowerCase() === email) return { status: "error", message: "Enter a different email address." };
    const supabase = await createServerSupabaseClient();
    const result = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${getSiteOrigin()}/auth/confirm` });
    if (result.error) return { status: "error", message: "The email change could not be requested. Please try again later." };
    const audit = await supabase.rpc("record_own_email_change_request");
    if (audit.error || audit.data !== true) return { status: "error", message: "The request was submitted, but its security status could not be confirmed. Contact support before retrying." };
    revalidatePath("/account");
    return { status: "success", message: "Email change requested. Follow the confirmation instructions sent by the email provider. Your current address remains trusted until the change is confirmed." };
  } catch {
    return { status: "error", message: "The email change could not be requested. Please try again later." };
  }
}
