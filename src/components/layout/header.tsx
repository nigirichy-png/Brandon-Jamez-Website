import { getCurrentUser } from "@/lib/auth/session";

import { HeaderNavigation } from "./header-navigation";

export async function Header() {
  const user = await getCurrentUser();
  return <HeaderNavigation authenticated={Boolean(user)} />;
}
