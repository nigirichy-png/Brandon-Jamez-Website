import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { getPublicLegalConfig } from "@/lib/site/legal-config";

export const metadata: Metadata = { title: "Legal notice", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

export default function LegalNoticePage() {
  const legal = getPublicLegalConfig();

  return <LegalPage eyebrow="Operator information" title="Legal notice" description="Pre-launch operator and contact information for this internationally available website." incomplete={!legal.complete}>
    <LegalSection title="Website operator">
      {legal.operatorName ? <p><strong>{legal.operatorName}</strong></p> : <p>Operator name pending.</p>}
      {legal.entityType ? <p>Legal form: {legal.entityType}</p> : <p>Individual or legal-entity status pending.</p>}
      {legal.representative ? <p>Represented by: {legal.representative}</p> : null}
      {legal.streetAddress ? <p>{legal.streetAddress}</p> : null}
      {legal.postalLocality ? <p>{legal.postalLocality}</p> : null}
      {legal.country ? <p>{legal.country}</p> : null}
    </LegalSection>
    <LegalSection title="Direct contact">
      {legal.supportEmail ? <p>Email: <a href={`mailto:${legal.supportEmail}`}>{legal.supportEmail}</a></p> : <p>Support email pending.</p>}
      {legal.phone ? <p>Telephone: {legal.phone}</p> : <p>Telephone contact pending.</p>}
    </LegalSection>
    <LegalSection title="Registration and tax information">
      {legal.registerName || legal.registerNumber ? <p>{[legal.registerName, legal.registerNumber].filter(Boolean).join(" · ")}</p> : <p>Registration details will be published if the final operator is a registered business and disclosure is required.</p>}
      {legal.vatId ? <p>Tax or VAT identification number: {legal.vatId}</p> : <p>Applicable public tax identification details are pending review.</p>}
    </LegalSection>
    <LegalSection title="Jurisdiction-specific disclosures"><p>The operator&apos;s actual country of establishment, legal form, target markets and audiovisual activities will determine which additional disclosures are required. Editorial responsibility, any competent media authority, consumer-contact information and adult-content obligations must be reviewed before launch; this page does not assume that German law applies exclusively.</p></LegalSection>
  </LegalPage>;
}
