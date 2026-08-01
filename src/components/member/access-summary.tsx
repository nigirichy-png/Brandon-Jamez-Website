import type { MemberAccessDecision, MockAccessScenario } from "@/lib/entitlements/types";

type SummaryItem = {
  label: string;
  value: string;
  ok: boolean;
};

export function AccessSummary({ state, decision }: { state: MockAccessScenario; decision: MemberAccessDecision }) {
  const items: SummaryItem[] = [
    { label: "Authentication", value: state.authenticated ? "Signed in (mock)" : "Not signed in", ok: state.authenticated },
    { label: "Age verification", value: state.ageVerified ? "Verified (mock)" : "Required", ok: state.ageVerified },
    { label: "Subscription", value: state.subscriptionSummary, ok: state.subscriptionActive && state.subscriptionStatus === "active" },
    { label: "Account", value: state.accountBlocked ? "Blocked" : "In good standing", ok: !state.accountBlocked },
    { label: "Final access", value: decision.allowed ? "Allowed in this demo" : "Not allowed", ok: decision.allowed },
  ];

  return (
    <section aria-labelledby="access-summary-title">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-cyan-300">Server evaluation</p>
          <h2 id="access-summary-title" className="font-display mt-2 text-3xl font-bold tracking-tight text-white">Access summary</h2>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] ${decision.allowed ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : "border-rose-300/25 bg-rose-300/10 text-rose-200"}`}>{decision.allowed ? "Allowed" : "Gated"}</span>
      </div>
      <dl className="grid overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-[var(--surface)] sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="border-b border-white/10 p-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0">
            <dt className="text-xs font-extrabold uppercase tracking-[0.12em] text-zinc-500">{item.label}</dt>
            <dd className={`mt-2 flex gap-2 text-sm font-bold leading-5 ${item.ok ? "text-emerald-200" : "text-zinc-300"}`}>
              <span aria-hidden="true">{item.ok ? "✓" : "—"}</span>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
