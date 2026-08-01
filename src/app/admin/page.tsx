import type { Metadata } from "next";

import { ProtectedPlaceholder } from "@/components/protected/protected-placeholder";

export const metadata: Metadata = { title: "Admin Area Placeholder" };

export default function AdminPage() {
  return <ProtectedPlaceholder area="Admin area" eyebrow="Future administration route" description="This area will require a validated session, an unblocked account, and an admin role checked on the server for every sensitive operation." />;
}
