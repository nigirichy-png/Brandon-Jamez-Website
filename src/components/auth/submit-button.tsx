"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ idleLabel, pendingLabel, disabled = false }: { idleLabel: string; pendingLabel: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending} className="min-h-11 w-full border border-[var(--public-gold)] bg-[var(--public-gold)] px-5 font-extrabold text-[var(--public-ink)] transition-colors hover:bg-[var(--public-gold-bright)] disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-700 disabled:text-zinc-400">{pending ? pendingLabel : idleLabel}</button>;
}
