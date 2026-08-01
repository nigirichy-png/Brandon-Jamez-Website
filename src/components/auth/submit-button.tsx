"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ idleLabel, pendingLabel, disabled = false }: { idleLabel: string; pendingLabel: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending} className="min-h-13 w-full rounded-full bg-fuchsia-500 px-5 font-extrabold text-white shadow-[var(--shadow-accent)] transition-colors hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400">{pending ? pendingLabel : idleLabel}</button>;
}
