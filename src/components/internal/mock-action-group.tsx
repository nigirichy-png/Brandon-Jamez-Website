export function MockActionGroup({ actions }: { actions: string[] }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Non-persistent development actions">
      {actions.map((action) => <button key={action} type="button" disabled title="Development preview only; this action does not persist" className="min-h-9 cursor-not-allowed rounded border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs font-medium text-zinc-500 disabled:opacity-70">{action}</button>)}
    </div>
  );
}
