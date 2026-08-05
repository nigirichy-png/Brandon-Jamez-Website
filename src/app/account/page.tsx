import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DisplayNameForm } from "@/components/account/display-name-form";
import { StatusLabel } from "@/components/internal/status-label";
import { loadRealAccountState } from "@/lib/auth/access-state";
import { isStripeConfigured } from "@/lib/stripe/config";
import { signOutAction } from "./actions";
import { openStripePortalAction } from "./subscription-actions";

export const metadata: Metadata = { title: "Account" };

const buttonClass =
  "public-action-secondary";

const inactiveSubscriptionSummary = {
  incomplete: "Subscription incomplete — paid access is inactive",
  trialing: "Trial period — paid access is inactive",
  past_due: "Payment past due — paid access is inactive",
  unpaid: "Subscription unpaid — paid access is inactive",
  paused: "Subscription paused — paid access is inactive",
} as const;

type AccountPageProps = {
  searchParams: Promise<{ access?: string; billing?: string; checkout?: string }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const query = await searchParams;
  const state = await loadRealAccountState();
  if (!state.user) redirect("/login?next=/account");
  const createdAt = state.createdAt
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(new Date(state.createdAt))
    : "Unavailable";
  const periodEnd = state.subscriptionPeriodEnd
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(new Date(state.subscriptionPeriodEnd))
    : null;
  const stripeConfigured = isStripeConfigured();
  const hasBillingRecord = !["none", "inactive"].includes(
    state.subscriptionStatus,
  );
  const paidAccessBadge = state.subscriptionActive
    ? state.cancelAtPeriodEnd && periodEnd
      ? `Active until ${periodEnd}`
      : "Active"
    : "Inactive";
  const paidAccessSummary = state.subscriptionActive
    ? state.cancelAtPeriodEnd
      ? "Subscription canceled — will not renew"
      : periodEnd
        ? `Renews on ${periodEnd}`
        : "Renewal date unavailable"
    : state.subscriptionStatus in inactiveSubscriptionSummary
      ? inactiveSubscriptionSummary[
          state.subscriptionStatus as keyof typeof inactiveSubscriptionSummary
        ]
      : "Subscription ended";

  return (
    <main
      id="main-content"
      className="public-account flex-1 py-10 sm:py-14"
    >
      <div className="public-account-header">
        <div>
          <p className="platform-kicker">Account</p>
          <h1 className="public-account-title">
            Your account
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--public-muted)]">
            Manage your identity, access, billing and security settings.
          </p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="public-action-secondary"
          >
            Sign out
          </button>
        </form>
      </div>
      {state.accessLoadFailed ? (
        <p
          role="alert"
          className="mt-7 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm text-rose-100"
        >
          Some account state could not be loaded. Access has been denied
          conservatively.
        </p>
      ) : null}
      {state.accountBlocked ? (
        <p className="mt-7 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100">
          Account access is restricted. Contact support if you believe this is
          an error.
        </p>
      ) : null}
      {query.checkout === "success" ? (
        <p
          role="status"
          className="mt-7 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4 text-sm text-emerald-100"
        >
          Checkout finished. Paid access appears after Stripe&apos;s signed
          webhook is verified; this page never trusts the redirect alone.
        </p>
      ) : null}
      {query.access === "subscription_required" ? (
        <p
          role="status"
          className="mt-7 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100"
        >
          An active paid subscription is required to open the subscriber area.
        </p>
      ) : null}
      {query.billing === "portal_unavailable" ||
      query.billing === "no_customer" ? (
        <p
          role="alert"
          className="mt-7 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm text-rose-100"
        >
          Subscription management is temporarily unavailable.
        </p>
      ) : null}
      <nav aria-label="Account settings" className="mt-7">
        <Link
          href="/account/security"
          className="public-action-primary"
        >
          Account security
        </Link>
      </nav>
      <section
        className="public-account-grid mt-7"
        aria-label="Account details"
      >
        <article className="public-account-card">
          <p className="public-account-label">
            Email
          </p>
          <p className="mt-3 break-all font-bold text-white">
            {state.user.email ?? "Unavailable"}
          </p>
        </article>
        <article className="public-account-card sm:col-span-2">
          <p className="public-account-label">
            Profile
          </p>
          <DisplayNameForm currentName={state.displayName} />
        </article>
        <article className="public-account-card">
          <p className="public-account-label">
            Created
          </p>
          <p className="mt-3 font-bold text-white">{createdAt}</p>
        </article>
        <article className="public-account-card">
          <p className="public-account-label">
            Account status
          </p>
          <div className="mt-3">
            <StatusLabel tone={state.accountBlocked ? "danger" : "positive"}>
              {state.accountBlocked ? "Restricted" : "Active"}
            </StatusLabel>
          </div>
        </article>
        <article className="public-account-card">
          <p className="public-account-label">
            Roles
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {state.roles.length ? (
              state.roles.map((role) => (
                <StatusLabel key={role} tone="info">
                  {role.replace("_", " ")}
                </StatusLabel>
              ))
            ) : (
              <StatusLabel>No assigned role</StatusLabel>
            )}
          </div>
        </article>
        <article className="public-account-card">
          <p className="public-account-label">
            Age verification
          </p>
          <div className="mt-3">
            <StatusLabel tone={state.ageVerified ? "positive" : "neutral"}>
              {state.ageVerified ? "Verified" : "Not verified"}
            </StatusLabel>
          </div>
        </article>
        <article className="public-account-card">
          <p className="public-account-label">
            Paid access
          </p>
          <div className="mt-3">
            <StatusLabel
              tone={state.subscriptionActive ? "positive" : "neutral"}
            >
              {paidAccessBadge}
            </StatusLabel>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {paidAccessSummary}
          </p>
          <div className="mt-4">
            {hasBillingRecord && stripeConfigured && !state.accountBlocked ? (
              <form action={openStripePortalAction}>
                <button
                  type="submit"
                  className="public-action-secondary"
                >
                  Manage subscription
                </button>
              </form>
            ) : hasBillingRecord && !stripeConfigured ? (
              <>
                <span
                  aria-disabled="true"
                  className="inline-flex min-h-11 cursor-not-allowed items-center border border-[var(--public-rule)] px-4 text-sm font-extrabold text-zinc-500"
                >
                  Management unavailable
                </span>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Stripe account management is not configured.
                </p>
              </>
            ) : !state.subscriptionActive ? (
              <Link
                href="/subscribe"
                className="public-action-primary"
              >
                Subscribe
              </Link>
            ) : null}
          </div>
        </article>
      </section>
      <nav aria-label="Authorized areas" className="mt-8 flex flex-wrap gap-3">
        {state.roles.includes("admin") && !state.accountBlocked ? (
          <Link
            href="/admin"
            className="public-action-secondary"
          >
            Administration
          </Link>
        ) : null}
        {(state.roles.includes("moderator") || state.roles.includes("admin")) &&
        !state.accountBlocked ? (
          <Link href="/mod" className={buttonClass}>
            Moderation
          </Link>
        ) : null}
        {(state.roles.includes("content_manager") ||
          state.roles.includes("admin")) &&
        !state.accountBlocked ? (
          <Link href="/content" className={buttonClass}>
            Content management
          </Link>
        ) : null}
        {state.subscriptionActive && !state.accountBlocked ? (
          <Link
            href="/subscriber"
            className="public-action-primary"
          >
            Subscriber area
          </Link>
        ) : null}
        <Link href="/" className={buttonClass}>
          Public website
        </Link>
      </nav>
    </main>
  );
}
