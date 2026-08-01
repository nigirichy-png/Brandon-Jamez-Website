import type { Metadata } from "next";

import { ProtectedPlaceholder } from "@/components/protected/protected-placeholder";

export const metadata: Metadata = { title: "Member Area Placeholder" };

export default function MemberPage() {
  return <ProtectedPlaceholder area="Member area" eyebrow="Future subscriber route" description="This will eventually hold an entitled subscriber experience after authentication, age verification, subscription, and account checks all pass on the server." />;
}
