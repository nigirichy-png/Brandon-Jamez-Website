import type { Metadata } from "next";

import { ProtectedPlaceholder } from "@/components/protected/protected-placeholder";

export const metadata: Metadata = { title: "Moderator Area Placeholder" };

export default function ModeratorPage() {
  return <ProtectedPlaceholder area="Moderator area" eyebrow="Future staff route" description="This area will require a validated session, an unblocked account, and a moderator or admin role checked on the server." />;
}
