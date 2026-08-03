import "server-only";

import { redirect } from "next/navigation";

import { resolveMemberAccessState } from "@/lib/auth/access-state";
import { evaluateMemberAccess } from "./evaluate-member-access";
import type { MemberAccessState } from "./types";

export async function requireSubscriberAccess(): Promise<MemberAccessState> {
  const state = await resolveMemberAccessState(undefined);
  const decision = evaluateMemberAccess(state);

  if (decision.allowed) return state;
  if (decision.reason === "not_authenticated") redirect("/login?next=/subscriber");
  if (decision.reason === "account_blocked") redirect("/account");

  redirect("/account?access=subscription_required");
}
