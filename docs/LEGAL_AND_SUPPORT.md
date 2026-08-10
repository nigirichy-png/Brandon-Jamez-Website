# Legal and support launch checklist

The repository provides `/legal-notice`, `/privacy`, `/terms`, and `/support` plus permanent footer links. The pages deliberately show a pre-launch warning until verified operator and contact settings are present. They are an implementation and data-flow inventory, not a substitute for advice covering the operator's actual seat, target markets, media activity, adult-content obligations, taxes, or subscription terms.

## Required operator input

Configure these server-side Vercel Production variables only from verified documents:

- `LEGAL_OPERATOR_NAME`
- `LEGAL_ENTITY_TYPE` (individual, company, or other verified legal form)
- `LEGAL_REPRESENTATIVE` when the operator is a legal entity
- `LEGAL_STREET_ADDRESS`
- `LEGAL_POSTAL_LOCALITY`
- `LEGAL_COUNTRY`
- `LEGAL_PHONE`
- `SUPPORT_EMAIL`
- register name and number when registered
- VAT ID when one exists and publication is required

The public support mailbox must be on a registered, monitored domain. Do not publish an address that cannot receive account, privacy, billing, and security messages.

## Review before launch

1. Establish which country's law applies from the operator's real seat and activities; explicitly assess Thailand's PDPA and assess GDPR territorial scope for any intentional EU/EEA offering or monitoring. Do not infer jurisdiction from the visitor language or hosting region.
2. Have the legal notice checked for the operator form, representative, register, tax information, editorial responsibility, audiovisual-media authority, and any additional adult-content duties.
3. Review the privacy inventory against the actual Vercel, Supabase, DNS, Resend, Mapbox, video, monitoring, and future age-verification production settings and signed data-processing terms.
4. Approve concrete retention periods for accounts, audit records, provider logs, support messages, backups, billing records, and age-verification results.
5. Decide whether each external player or map requires prior consent in the target jurisdictions. If so, gate the provider request behind a real consent choice before enabling it.
6. Before Stripe live mode, professionally review the prepared membership framework and insert the actual price, tax, renewal, cancellation, withdrawal, refund, service-scope, complaint, and jurisdiction details. Do not use a governing-law clause to override mandatory consumer protections.
7. Test that every footer link is reachable while signed out and on mobile, and that support never asks for passwords, login links, full payment data, or identity documents over ordinary email.

## Current technical facts

- No advertising or analytics library is configured.
- Supabase authentication uses necessary cookie-backed sessions.
- Password recovery uses a signed HttpOnly marker for ten minutes.
- Guide favourites use browser local storage.
- Public video previews can contact YouTube after interaction; subscriber posts can contain YouTube or Vimeo players.
- Vercel and Supabase are current infrastructure recipients.
- Resend, live Stripe billing, professional age verification, and private streaming are not active and must trigger a policy review before activation.

The operator must record the review date, reviewer, applicable jurisdiction, approved text version, and production environment values before this launch point is marked complete.
