import Link from "next/link";

import type { StaffAccessDecision, StaffArea } from "@/lib/staff/types";

const copy = {
  not_authenticated: { title: "Staff sign-in is required", description: "This public development route has no authenticated staff session. Use the selector only to preview the planned interface." },
  account_blocked: { title: "Internal access is unavailable", description: "The simulated account is not eligible for internal access. No internal blocking reason or operations data is shown." },
  moderator_role_required: { title: "Moderator role required", description: "Subscriber or content access does not grant moderation permission. A future trusted database role must authorize this area." },
  content_manager_role_required: { title: "Content-manager role required", description: "This area requires a trusted content-manager or admin role. Subscriber and moderator roles are separate." },
  admin_role_required: { title: "Administrator role required", description: "Administrative permission is distinct from moderation, content management, and subscriber entitlement." },
};

export function StaffAccessGate({ decision, area }: { decision: StaffAccessDecision; area: StaffArea }) {
  if (decision.reason === "allowed") return null;
  const content = copy[decision.reason];
  return (
    <section className="relative overflow-hidden rounded-3xl border border-rose-300/15 bg-gradient-to-br from-rose-400/[0.06] via-[#11141b] to-cyan-300/[0.025] p-6 sm:p-9">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-rose-200">{area} area gated</p>
      <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">{content.title}</h2>
      <p className="mt-4 max-w-2xl leading-7 text-zinc-400">{content.description}</p>
      {decision.reason === "not_authenticated" ? <Link href="/login" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-fuchsia-500 px-5 py-2 text-sm font-extrabold text-white hover:bg-fuchsia-400">View sign-in preview</Link> : null}
    </section>
  );
}
