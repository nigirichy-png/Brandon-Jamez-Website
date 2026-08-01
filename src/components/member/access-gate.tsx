import { ButtonLink } from "@/components/ui/button-link";
import type { MemberAccessDecision } from "@/lib/entitlements/types";

const gateCopy = {
  not_authenticated: { title: "Sign in to continue", description: "A validated server-side session will be required before the member library can be considered.", action: "View sign-in preview", href: "/login" },
  account_blocked: { title: "Member access is paused", description: "Account restrictions override every role and subscription state. A future support process would review this status.", action: "Support contact not connected", href: null },
  age_verification_required: { title: "Age verification is required", description: "A professional provider will handle this future step. This demo never collects identity documents.", action: "View verification plan", href: "/verify-age" },
  subscription_required: { title: "An active subscription is required", description: "Verification is complete in this mock scenario, but subscriber entitlement is not active.", action: "Explore membership", href: "/subscribe" },
  subscription_expired: { title: "This mock subscription has expired", description: "Future renewal status will come only from verified payment-provider webhooks, never a browser toggle.", action: "Review membership", href: "/subscribe" },
};

export function AccessGate({ decision }: { decision: MemberAccessDecision }) {
  if (decision.reason === "allowed") return null;
  const content = gateCopy[decision.reason];
  return (
    <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-fuchsia-300/20 bg-gradient-to-br from-fuchsia-500/[0.08] via-[var(--surface)] to-cyan-300/[0.05] p-7 sm:p-10 lg:p-14">
      <div className="absolute -right-20 -top-24 size-64 rounded-full border-[40px] border-white/[0.04]" aria-hidden="true" />
      <p className="eyebrow relative text-fuchsia-300">Member library gated</p>
      <h2 className="font-display relative mt-4 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">{content.title}</h2>
      <p className="relative mt-4 max-w-2xl leading-7 text-zinc-300">{content.description}</p>
      {content.href ? <ButtonLink href={content.href} className="relative mt-7">{content.action}</ButtonLink> : <span aria-disabled="true" className="relative mt-7 inline-flex min-h-12 cursor-not-allowed items-center rounded-full bg-zinc-700 px-6 py-3 text-sm font-extrabold text-zinc-400">{content.action}</span>}
    </section>
  );
}
