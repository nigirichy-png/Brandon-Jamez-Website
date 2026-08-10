import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { getPublicLegalConfig } from "@/lib/site/legal-config";

export const metadata: Metadata = { title: "Support" };
export const dynamic = "force-dynamic";

export default function SupportPage() {
  const legal = getPublicLegalConfig();

  return <LegalPage eyebrow="Account and website help" title="Support" description="One clear route for account, privacy, billing and security help. Never send passwords, login links, full payment details, identity documents or authentication tokens." incomplete={!legal.supportEmail}>
    <LegalSection title="Contact support">
      {legal.supportEmail ? <p>Email <a href={`mailto:${legal.supportEmail}`}>{legal.supportEmail}</a>. Include the affected page, account email if relevant, approximate time and a short description—but no secrets or sensitive documents.</p> : <p>The public support mailbox is not active yet. Account creation and paid services must not launch until a monitored address on the registered domain is configured and tested.</p>}
    </LegalSection>
    <LegalSection title="Account access">
      <ul><li><Link href="/forgot-password">Reset a forgotten password</Link></li><li><Link href="/account/security">Change password or email while signed in</Link></li><li><Link href="/auth/error">Open authentication help</Link></li></ul>
    </LegalSection>
    <LegalSection title="Billing and cancellation"><p>Billing support becomes available only when live subscriptions are activated. The final support route must handle receipts, cancellation, refunds where available and payment disputes without asking for full card details. Restricted accounts require manual review; support cannot request a password or bypass account security.</p></LegalSection>
    <LegalSection title="Privacy requests"><p>Access, correction, deletion or other privacy requests can use the same monitored address once configured. Support may request limited information to verify identity but must not ask users to send passwords, one-time codes or unnecessary identity documents by ordinary email.</p></LegalSection>
    <LegalSection title="Security reports"><p>Report suspected account compromise or a website security issue through the support address with minimal personal data. Do not publicly disclose active credentials or private user information.</p></LegalSection>
  </LegalPage>;
}
