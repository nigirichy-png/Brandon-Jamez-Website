export function MockActionGroup({ actions }: { actions: string[] }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Non-persistent development actions">
      {actions.map((action) => <button key={action} type="button" disabled title="Development preview only; this action does not persist" className="min-h-11 cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.035] px-3.5 py-2 text-xs font-extrabold text-zinc-500 disabled:opacity-80">{action} · preview</button>)}
    </div>
  );
}
