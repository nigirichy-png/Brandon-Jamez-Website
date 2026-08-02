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
  "inline-flex min-h-11 items-center rounded-xl border border-white/15 px-5 text-sm font-extrabold text-white hover:bg-white/[0.05]";

type AccountPageProps = {
  searchParams: Promise<{ billing?: string; checkout?: string }>;
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

  return (
    <main
      id="main-content"
      className="page-shell flex-1 py-12 sm:py-16 lg:py-20"
    >
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-white/10 pb-8">
        <div>
          <p className="eyebrow text-cyan-300">Validated Supabase account</p>
          <h1 className="font-display mt-3 text-5xl font-bold tracking-tight text-white sm:text-6xl">
            Account summary
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
            Safe identity and access state loaded on the server through the
            authenticated session and RLS-protected records.
          </p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="min-h-11 rounded-full border border-white/15 px-5 text-sm font-extrabold text-white hover:bg-white/[0.05]"
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
          className="inline-flex min-h-11 items-center rounded-xl bg-fuchsia-500 px-5 text-sm font-extrabold text-white hover:bg-fuchsia-400"
        >
          Account security
        </Link>
      </nav>
      <section
        className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Account details"
      >
        <article className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-600">
            Email
          </p>
          <p className="mt-3 break-all font-bold text-white">
            {state.user.email ?? "Unavailable"}
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5 sm:col-span-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-600">
            Profile
          </p>
          <DisplayNameForm currentName={state.displayName} />
        </article>
        <article className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-600">
            Created
          </p>
          <p className="mt-3 font-bold text-white">{createdAt}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-600">
            Account status
          </p>
          <div className="mt-3">
            <StatusLabel tone={state.accountBlocked ? "danger" : "positive"}>
              {state.accountBlocked ? "Restricted" : "Active"}
            </StatusLabel>
          </div>
        </article>
        <article className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-600">
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
        <article className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-600">
            Age verification
          </p>
          <div className="mt-3">
            <StatusLabel tone={state.ageVerified ? "positive" : "neutral"}>
              {state.ageVerified ? "Verified" : "Not verified"}
            </StatusLabel>
          </div>
        </article>
        <article className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-600">
            Paid access
          </p>
          <div className="mt-3">
            <StatusLabel
              tone={state.subscriptionActive ? "positive" : "neutral"}
            >
              {state.subscriptionActive ? "Active" : "Inactive"}
            </StatusLabel>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Stripe state: {state.subscriptionStatus.replaceAll("_", " ")}.
            {periodEnd
              ? ` ${state.cancelAtPeriodEnd ? "Access ends" : "Current period ends"} ${periodEnd}.`
              : ""}
          </p>
          <div className="mt-4">
            {hasBillingRecord && stripeConfigured && !state.accountBlocked ? (
              <form action={openStripePortalAction}>
                <button
                  type="submit"
                  className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-extrabold text-white hover:border-cyan-300/40"
                >
                  Manage subscription
                </button>
              </form>
            ) : hasBillingRecord && !stripeConfigured ? (
              <>
                <span
                  aria-disabled="true"
                  className="inline-flex min-h-11 cursor-not-allowed items-center rounded-xl border border-white/10 px-4 text-sm font-extrabold text-zinc-500"
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
                className="inline-flex min-h-11 items-center rounded-xl bg-fuchsia-500 px-4 text-sm font-extrabold text-white hover:bg-fuchsia-400"
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
            className="inline-flex min-h-11 items-center rounded-xl bg-cyan-400 px-5 text-sm font-extrabold text-slate-950 hover:bg-cyan-300"
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
            href="/member"
            className="inline-flex min-h-11 items-center rounded-xl bg-fuchsia-500 px-5 text-sm font-extrabold text-white hover:bg-fuchsia-400"
          >
            Member area
          </Link>
        ) : null}
        <Link href="/" className={buttonClass}>
          Public website
        </Link>
      </nav>
    </main>
  );
}
