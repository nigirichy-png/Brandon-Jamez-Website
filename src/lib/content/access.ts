import "server-only";

import { redirect } from "next/navigation";

import { loadRealAccountState } from "@/lib/auth/access-state";

export async function requireRealContentEditor(nextPath: string) {
  const state = await loadRealAccountState();
  if (!state.user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  const allowed = !state.accessLoadFailed
    && !state.accountBlocked
    && (state.roles.includes("content_manager") || state.roles.includes("admin"));
  return { state, allowed } as const;
}
