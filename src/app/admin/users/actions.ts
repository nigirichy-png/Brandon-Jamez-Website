"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminAccount, requireRealAdmin } from "@/lib/admin/data";
import { isAssignableRole, isUuid } from "@/lib/admin/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function destination(userId: string, kind: "status" | "error", value: string) {
  return `/admin/users/${encodeURIComponent(userId)}?${kind}=${encodeURIComponent(value)}`;
}

async function authorizeAndReadTarget(userId: string) {
  const authorization = await requireRealAdmin(`/admin/users/${encodeURIComponent(userId)}`);
  if (!authorization.allowed) redirect("/admin?error=admin_required");
  if (!isUuid(userId)) redirect("/admin/users?error=invalid_account");
  await getAdminAccount(userId);
}

function confirm(formData: FormData): boolean {
  return formData.get("confirmation") === "confirmed";
}

function refreshAdminPaths(userId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/audit");
}

export async function assignRoleAction(userId: string, role: string, formData: FormData) {
  if (!isUuid(userId) || !isAssignableRole(role) || !confirm(formData)) redirect(destination(userId, "error", "confirmation_required"));
  let outcome = destination(userId, "error", "role_change_failed");
  try {
    await authorizeAndReadTarget(userId);
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("admin_assign_role", { p_target_user_id: userId, p_role: role });
    if (!error) {
      const admin = createAdminSupabaseClient();
      const verification = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", role).maybeSingle();
      if (!verification.error && verification.data?.role === role) {
        refreshAdminPaths(userId);
        outcome = destination(userId, "status", "role_assigned");
      }
    }
  } catch {
    outcome = destination(userId, "error", "role_change_failed");
  }
  redirect(outcome);
}

export async function removeRoleAction(userId: string, role: string, formData: FormData) {
  if (!isUuid(userId) || !isAssignableRole(role) || !confirm(formData)) redirect(destination(userId, "error", "confirmation_required"));
  let outcome = destination(userId, "error", "role_change_failed");
  try {
    await authorizeAndReadTarget(userId);
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("admin_remove_role", { p_target_user_id: userId, p_role: role });
    if (!error) {
      const admin = createAdminSupabaseClient();
      const verification = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", role).maybeSingle();
      if (!verification.error && !verification.data) {
        refreshAdminPaths(userId);
        outcome = destination(userId, "status", "role_removed");
      }
    }
  } catch {
    outcome = destination(userId, "error", "role_change_failed");
  }
  redirect(outcome);
}

export async function blockAccountAction(userId: string, formData: FormData) {
  const reasonValue = formData.get("reason");
  const reason = typeof reasonValue === "string" ? reasonValue.trim() : "";
  if (!isUuid(userId) || !confirm(formData) || reason.length < 3 || reason.length > 500 || /[\p{Cc}\p{Cf}]/u.test(reason)) redirect(destination(userId, "error", "invalid_block_request"));
  let outcome = destination(userId, "error", "block_failed");
  try {
    await authorizeAndReadTarget(userId);
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("admin_block_account", { p_target_user_id: userId, p_reason: reason });
    if (!error) {
      const admin = createAdminSupabaseClient();
      const verification = await admin.from("account_restrictions").select("blocked").eq("user_id", userId).maybeSingle();
      if (!verification.error && verification.data?.blocked === true) {
        refreshAdminPaths(userId);
        outcome = destination(userId, "status", "account_blocked");
      }
    }
  } catch {
    outcome = destination(userId, "error", "block_failed");
  }
  redirect(outcome);
}

export async function restoreAccountAction(userId: string, formData: FormData) {
  if (!isUuid(userId) || !confirm(formData)) redirect(destination(userId, "error", "confirmation_required"));
  let outcome = destination(userId, "error", "restore_failed");
  try {
    await authorizeAndReadTarget(userId);
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("admin_restore_account", { p_target_user_id: userId });
    if (!error) {
      const admin = createAdminSupabaseClient();
      const verification = await admin.from("account_restrictions").select("blocked").eq("user_id", userId).maybeSingle();
      if (!verification.error && verification.data?.blocked !== true) {
        refreshAdminPaths(userId);
        outcome = destination(userId, "status", "account_restored");
      }
    }
  } catch {
    outcome = destination(userId, "error", "restore_failed");
  }
  redirect(outcome);
}
