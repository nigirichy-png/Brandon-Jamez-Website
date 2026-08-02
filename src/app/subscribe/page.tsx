import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/ui/page-hero";
import { loadRealAccountState } from "@/lib/auth/access-state";
import { isStripeConfigured } from "@/lib/stripe/config";

import { startStripeCheckoutAction } from "./actions";

export const metadata: Metadata = { title: "Subscribe" };
export const dynamic = "force-dynamic";

const requirements = [
  { title: "Secure account", detail: "Checkout is available only after Supabase confirms your signed-in account." },
  { title: "Stripe-hosted payment", detail: "Payment details are entered on Stripe Checkout, never on this website." },
  { title: "Verified synchronization", detail: "Access starts only after a signed Stripe webhook records a paid active period." },
  { title: "Account in good standing", detail: "An account restriction overrides subscription status immediately." },
];

type SubscribePageProps = {
  searchParams: Promise<{ billing?: string; checkout?: string }>;
};

export default async function SubscribePage({ searchParams }: SubscribePageProps) {
  const [query, state] = await Promise.all([searchParams, loadRealAccountState()]);
  const configured = isStripeConfigured();
  const unavailable = query.billing === "unavailable" || query.billing === "customer_unavailable";
  const denied = query.billing === "denied" || query.billing === "customer_mismatch";
  const rateLimited = query.billing === "try_later";

  return <main id="main-content" className="flex-1">
    <PageHero eyebrow="Membership" title="Subscribe through Stripe. Access after verification." description="A paid membership is activated only by signed Stripe subscription updates with a future paid-through date. A role or browser response can never grant access.">
      {state.subscriptionActive ? <Link href="/account" className="inline-flex min-h-12 items-center justify-center rounded-full bg-fuchsia-500 px-6 py-3 text-sm font-extrabold text-white">Manage subscription</Link> : state.user && configured && !state.accountBlocked ? <form action={startStripeCheckoutAction}><button type="submit" className="min-h-12 rounded-full bg-fuchsia-500 px-6 py-3 text-sm font-extrabold text-white shadow-[var(--shadow-accent)] hover:bg-fuchsia-400">Continue to secure checkout</button></form> : !state.user ? <Link href="/login?next=/subscribe" className="inline-flex min-h-12 items-center justify-center rounded-full bg-fuchsia-500 px-6 py-3 text-sm font-extrabold text-white">Sign in to subscribe</Link> : <span aria-disabled="true" className="inline-flex min-h-12 cursor-not-allowed items-center rounded-full bg-zinc-700 px-6 py-3 text-sm font-extrabold text-zinc-400">Checkout unavailable</span>}
    </PageHero>

    <section className="page-shell py-10 sm:py-14" aria-live="polite">
      {!configured ? <p role="status" className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-5 text-amber-100">Subscriptions are not configured yet. No payment can be started until the Stripe test or live settings are completed securely.</p> : null}
      {state.accountBlocked || denied ? <p role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-5 text-rose-100">Subscription checkout is unavailable for this account.</p> : null}
      {unavailable ? <p role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-5 text-rose-100">Stripe Checkout could not be opened safely. Please try again later.</p> : null}
      {rateLimited ? <p role="status" className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-5 text-amber-100">A checkout request was just started. Wait a minute before trying again.</p> : null}
      {query.checkout === "canceled" ? <p role="status" className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-zinc-300">Checkout was canceled. No subscription change was made.</p> : null}
    </section>

    <section className="page-shell pb-[var(--section-space)]">
      <div className="grid gap-5 md:grid-cols-2">
        {requirements.map((item, index) => <article key={item.title} className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6"><p className="font-display text-xl font-bold text-fuchsia-300">0{index + 1}</p><h2 className="font-display mt-3 text-2xl font-bold text-white">{item.title}</h2><p className="mt-3 leading-7 text-zinc-400">{item.detail}</p></article>)}
      </div>
      <p className="mt-8 max-w-3xl text-sm leading-7 text-zinc-500">Trials do not grant subscriber access. Canceling at the end of the billing period keeps access only until the current paid-through timestamp. Failed, past-due, unpaid, paused, incomplete, canceled, and expired subscriptions are denied.</p>
    </section>
  </main>;
}
