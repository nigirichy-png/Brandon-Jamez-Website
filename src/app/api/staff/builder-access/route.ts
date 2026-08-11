import { NextResponse } from "next/server";

import { loadRealAccountState } from "@/lib/auth/access-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await loadRealAccountState();
  const authenticated = Boolean(state.user);
  const accountAvailable = authenticated && !state.accountBlocked && !state.accessLoadFailed;
  const canEdit = accountAvailable && state.roles.includes("admin");
  const subscriberAccess = accountAvailable
    && state.subscriptionActive
    && !["canceled", "expired", "incomplete_expired"].includes(state.subscriptionStatus);

  return NextResponse.json(
    { canEdit, authenticated, subscriberAccess },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
