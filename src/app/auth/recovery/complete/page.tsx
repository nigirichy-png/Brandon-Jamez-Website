import type { Metadata } from "next";

import { RecoveryCompletion } from "@/components/auth/recovery-completion";

export const metadata: Metadata = { title: "Complete Password Recovery" };

export default function RecoveryCompletionPage() {
  return <RecoveryCompletion />;
}
