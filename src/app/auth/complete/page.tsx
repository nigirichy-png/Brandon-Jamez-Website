import type { Metadata } from "next";

import { ConfirmationCompletion } from "./confirmation-completion";

export const metadata: Metadata = { title: "Complete Email Confirmation" };

export default function CompleteEmailConfirmationPage() {
  return <ConfirmationCompletion />;
}
