import { resolveMemberAccessState } from "@/lib/auth/access-state";
import { evaluateMemberAccess } from "@/lib/entitlements/evaluate-member-access";

import { HeaderNavigation } from "./header-navigation";

export async function Header() {
  const state = await resolveMemberAccessState(undefined);
  const subscriberAccess = evaluateMemberAccess(state).allowed;

  return <HeaderNavigation authenticated={state.authenticated} subscriberAccess={subscriberAccess} />;
}
