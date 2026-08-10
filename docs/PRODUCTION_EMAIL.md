# Production authentication email

This repository is locally prepared for production authentication email. Nothing in this file means the domain, DNS, Resend, Supabase or Vercel production configuration is active.

## Locked production identity

| Purpose | Planned value |
| --- | --- |
| Public website | `https://brandonjamezofficial.com` |
| Authentication mail domain | `auth.brandonjamezofficial.com` |
| Sender | `Brandon Jamez <no-reply@auth.brandonjamezofficial.com>` |
| Confirmation callback | `https://brandonjamezofficial.com/auth/confirm` |
| Recovery callback | `https://brandonjamezofficial.com/auth/recovery` |

The authentication subdomain sends mail only. It is not an application origin and must not receive Supabase Auth callbacks.

## Already complete in the repository

- `.env.example` contains placeholders only and documents the planned identity without a credential.
- `supabase/config.toml` keeps localhost as the local Site URL and allowlists the exact local confirmation and recovery callbacks.
- Tracked templates cover signup confirmation, password recovery, email change, password-changed notification and email-changed notification.
- Action links use `SiteURL`, `TokenHash` and a fixed allowlisted token type; they do not accept a user-controlled redirect.
- The application callbacks validate their inputs and use fixed same-origin destinations.
- No Resend API key or SMTP password is required by the Next.js application or stored in this repository.

## Blocked until the domain is registered

Do not perform any item in this section before `brandonjamezofficial.com` is registered and ownership is controlled:

1. Secure the registrar account, recovery method, registrar lock and renewal.
2. Add `auth.brandonjamezofficial.com` to Resend and copy the exact SPF and DKIM records generated for that account. Do not guess DNS values.
3. Add and monitor an appropriate DMARC policy at the organizational domain before moving to enforcement.
4. Connect the verified Resend domain to the production Supabase project, preferably through the native integration. If custom SMTP is required, store its credential only in the provider configuration.
5. Configure the exact sender shown above and a monitored support or reply route. A `no-reply` address must not be the only route for account recovery or security help.
6. In hosted Supabase, set the production Site URL and the two exact production callback URLs. Retain the exact localhost callbacks only where local development needs them.
7. Install the five tracked templates and enable the password- and email-change notifications. Keep email confirmation and secure double confirmation for email changes enabled.
8. Set Vercel Production `NEXT_PUBLIC_SITE_URL` to the registered HTTPS origin. Never use the mail subdomain as that value.
9. Disable click and open tracking for authentication messages so security-sensitive links are not rewritten.
10. Review rate limits, provider retention, data-processing terms and the privacy notice against the production accounts.

Do not push the complete local `supabase/config.toml` merely to change Auth URLs or templates; review and change the intended hosted settings deliberately so unrelated Auth defaults are preserved.

## Template mapping

| Supabase template | Repository file |
| --- | --- |
| Confirm signup | `supabase/templates/confirmation.html` |
| Reset password | `supabase/templates/recovery.html` |
| Change email address | `supabase/templates/email-change.html` |
| Password changed notification | `supabase/templates/password-changed.html` |
| Email changed notification | `supabase/templates/email-changed.html` |

## Production acceptance test

After DNS and hosted configuration are complete, record the date, tester and result for every item:

- Signup delivery and confirmation succeed in Gmail, Outlook and iCloud.
- Every message and link uses the canonical HTTPS site and planned sender; no localhost or Vercel Preview origin appears.
- Used, malformed and expired links fail generically without exposing tokens or provider errors.
- Forgot-password produces the same browser response for existing and unknown addresses.
- Valid recovery reaches `/reset-password`; reuse and expiration fail safely.
- Password change invalidates the intended sessions and sends a notification.
- Email change uses both confirmations and notifies the previous address.
- SPF and DKIM pass, DMARC aligns, tracking is disabled and spam placement is acceptable.
- Resend and Supabase logs contain only expected delivery metadata and use approved retention.
- The monitored support route can handle account-security and delivery failures.

Production email is complete only after all acceptance checks pass. Domain registration, DNS verification, Resend connection, hosted Supabase changes and Vercel configuration remain intentionally untouched for now.
