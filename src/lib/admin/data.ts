import "server-only";

import { notFound, redirect } from "next/navigation";

import { loadRealAccountState } from "@/lib/auth/access-state";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import type { Role } from "@/types";
export { assignableRoles, isUuid, parsePage } from "@/lib/admin/validation";
import { isUuid } from "@/lib/admin/validation";

export const ADMIN_PAGE_SIZE = 12;
export const AUDIT_PAGE_SIZE = 20;
type AdminAccountSummary = {
  id: string;
  displayName: string;
  maskedEmail: string;
  createdAt: string;
  lastActivityAt: string | null;
  roles: Role[];
  blocked: boolean;
  ageStatus: string;
  subscriptionStatus: string;
};

export type SafeAuditEvent = {
  id: number;
  occurredAt: string;
  actorLabel: string;
  actorRoles: Role[];
  action: string;
  targetType: string;
  targetLabel: string;
  result: string;
};

function maskEmail(email?: string): string {
  if (!email) return "Email unavailable";
  const separator = email.lastIndexOf("@");
  if (separator < 1) return "Email unavailable";
  const local = email.slice(0, separator);
  const domain = email.slice(separator + 1);
  const visibleLocal = local.slice(0, Math.min(2, local.length));
  const domainParts = domain.split(".");
  const domainName = domainParts[0] ?? "";
  const suffix = domainParts.length > 1 ? `.${domainParts.at(-1)}` : "";
  return `${visibleLocal}${"•".repeat(Math.max(3, Math.min(8, local.length - visibleLocal.length)))}@${domainName.slice(0, 1)}•••${suffix}`;
}

async function assertActiveAdmin(): Promise<void> {
  const state = await loadRealAccountState();
  if (!state.user || state.accessLoadFailed || state.accountBlocked || !state.roles.includes("admin")) {
    throw new Error("active_admin_required");
  }
}

export async function requireRealAdmin(nextPath: string) {
  const state = await loadRealAccountState();
  if (!state.user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (state.accessLoadFailed || state.accountBlocked || !state.roles.includes("admin")) {
    return { state, allowed: false as const };
  }
  return { state, allowed: true as const };
}

function groupRoles(rows: { user_id: string; role: Database["public"]["Enums"]["app_role"] }[]) {
  const grouped = new Map<string, Role[]>();
  for (const row of rows) grouped.set(row.user_id, [...(grouped.get(row.user_id) ?? []), row.role]);
  return grouped;
}

export async function listAdminAccounts(page: number): Promise<{ users: AdminAccountSummary[]; page: number; total: number; totalPages: number }> {
  await assertActiveAdmin();
  const admin = createAdminSupabaseClient();
  const { data: authData, error: authError } = await admin.auth.admin.listUsers({ page, perPage: ADMIN_PAGE_SIZE });
  if (authError) throw new Error("admin_user_list_unavailable");
  const users = authData.users;
  const ids = users.map((user) => user.id);
  if (!ids.length) return { users: [], page, total: authData.total ?? 0, totalPages: Math.max(1, Math.ceil((authData.total ?? 0) / ADMIN_PAGE_SIZE)) };

  const [profiles, roles, restrictions, ages, subscriptions] = await Promise.all([
    admin.from("profiles").select("id, display_name").in("id", ids),
    admin.from("user_roles").select("user_id, role").in("user_id", ids),
    admin.from("account_restrictions").select("user_id, blocked").in("user_id", ids),
    admin.from("age_verifications").select("user_id, status").in("user_id", ids),
    admin.from("subscriptions").select("user_id, status").in("user_id", ids),
  ]);
  if (profiles.error || roles.error || restrictions.error || ages.error || subscriptions.error) throw new Error("admin_user_state_unavailable");

  const names = new Map((profiles.data ?? []).map((row) => [row.id, row.display_name]));
  const roleMap = groupRoles(roles.data ?? []);
  const blocked = new Map((restrictions.data ?? []).map((row) => [row.user_id, row.blocked]));
  const age = new Map((ages.data ?? []).map((row) => [row.user_id, row.status]));
  const subscription = new Map((subscriptions.data ?? []).map((row) => [row.user_id, row.status]));
  return {
    users: users.map((user) => ({
      id: user.id,
      displayName: names.get(user.id) ?? "Display name not set",
      maskedEmail: maskEmail(user.email),
      createdAt: user.created_at,
      lastActivityAt: user.last_sign_in_at ?? null,
      roles: roleMap.get(user.id) ?? [],
      blocked: blocked.get(user.id) ?? false,
      ageStatus: age.get(user.id) ?? "not started",
      subscriptionStatus: subscription.get(user.id) ?? "inactive",
    })),
    page,
    total: authData.total ?? users.length,
    totalPages: Math.max(1, Math.ceil((authData.total ?? users.length) / ADMIN_PAGE_SIZE)),
  };
}

export async function getAdminAccount(userId: string): Promise<AdminAccountSummary> {
  await assertActiveAdmin();
  if (!isUuid(userId)) notFound();
  const admin = createAdminSupabaseClient();
  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError || !authData.user) notFound();
  const [profile, roles, restriction, age, subscription] = await Promise.all([
    admin.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    admin.from("user_roles").select("role").eq("user_id", userId),
    admin.from("account_restrictions").select("blocked").eq("user_id", userId).maybeSingle(),
    admin.from("age_verifications").select("status").eq("user_id", userId).maybeSingle(),
    admin.from("subscriptions").select("status").eq("user_id", userId).maybeSingle(),
  ]);
  if (profile.error || roles.error || restriction.error || age.error || subscription.error) throw new Error("admin_user_state_unavailable");
  return {
    id: userId,
    displayName: profile.data?.display_name ?? "Display name not set",
    maskedEmail: maskEmail(authData.user.email),
    createdAt: authData.user.created_at,
    lastActivityAt: authData.user.last_sign_in_at ?? null,
    roles: (roles.data ?? []).map((row) => row.role),
    blocked: restriction.data?.blocked ?? false,
    ageStatus: age.data?.status ?? "not started",
    subscriptionStatus: subscription.data?.status ?? "inactive",
  };
}

export async function listAuditEvents(page: number, targetUserId?: string): Promise<{ events: SafeAuditEvent[]; totalPages: number }> {
  await assertActiveAdmin();
  const admin = createAdminSupabaseClient();
  const from = (page - 1) * AUDIT_PAGE_SIZE;
  let query = admin.from("audit_events").select("id, occurred_at, actor_user_id, actor_role_snapshot, action, target_type, target_user_id, target_label_snapshot, result", { count: "exact" }).order("occurred_at", { ascending: false }).order("id", { ascending: false }).range(from, from + AUDIT_PAGE_SIZE - 1);
  if (targetUserId) query = query.eq("target_user_id", targetUserId);
  const { data, error, count } = await query;
  if (error) throw new Error("audit_events_unavailable");
  const ids = [...new Set((data ?? []).flatMap((event) => [event.actor_user_id, event.target_user_id]).filter((id): id is string => Boolean(id)))];
  const profiles = ids.length ? await admin.from("profiles").select("id, display_name").in("id", ids) : { data: [], error: null };
  if (profiles.error) throw new Error("audit_actor_labels_unavailable");
  const labels = new Map((profiles.data ?? []).map((row) => [row.id, row.display_name ?? "Account"]));
  return {
    events: (data ?? []).map((event) => ({
      id: event.id,
      occurredAt: event.occurred_at,
      actorLabel: event.actor_user_id ? labels.get(event.actor_user_id) ?? "Former account" : "System",
      actorRoles: event.actor_role_snapshot,
      action: event.action,
      targetType: event.target_type,
      targetLabel: event.target_label_snapshot ?? (event.target_user_id ? labels.get(event.target_user_id) ?? "Account" : "System"),
      result: event.result,
    })),
    totalPages: Math.max(1, Math.ceil((count ?? 0) / AUDIT_PAGE_SIZE)),
  };
}
