import type { Metadata } from "next";

import { ProtectedPlaceholder } from "@/components/protected/protected-placeholder";

export const metadata: Metadata = { title: "Age Verification Placeholder" };

export default function VerifyAgePage() {
  return (
    <ProtectedPlaceholder
      area="Age verification"
      eyebrow="Future external verification"
      description="A professional provider will later handle document or eID verification and liveness checks. There is no fake checkbox here, and this site is not collecting identity documents."
    />
  );
}
