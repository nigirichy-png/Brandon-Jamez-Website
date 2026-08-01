"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { AuthShell } from "@/components/auth/auth-shell";
import { createImplicitConfirmationClient } from "@/lib/supabase/implicit-browser";
import type { Database } from "@/lib/supabase/types";
import { isStrongPassword, passwordRequirements } from "@/lib/validation/auth-credentials";

type RecoveryState = "working" | "ready" | "submitting" | "failed";

function clearCallbackFragment() {
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
}

export function RecoveryCompletion() {
  const [state, setState] = useState<RecoveryState>("working");
  const [message, setMessage] = useState("");
  const clientRef = useRef<SupabaseClient<Database> | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createImplicitConfirmationClient();
    clientRef.current = supabase;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || event !== "PASSWORD_RECOVERY" || !session) return;
      clearCallbackFragment();
      setState("ready");
    });
    void supabase.auth.getSession();
    const timeout = window.setTimeout(() => {
      if (!active) return;
      clearCallbackFragment();
      setState((current) => current === "working" ? "failed" : current);
    }, 5000);
    return () => {
      active = false;
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function updateRecoveredPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = formData.get("password");
    const confirmation = formData.get("passwordConfirmation");
    if (!isStrongPassword(password)) { setMessage(passwordRequirements); return; }
    if (password !== confirmation) { setMessage("The password confirmation does not match."); return; }
    const supabase = clientRef.current;
    if (!supabase || state !== "ready") { setState("failed"); return; }
    setMessage("");
    setState("submitting");
    const result = await supabase.auth.updateUser({ password });
    if (result.error) { setState("ready"); setMessage("The password could not be changed. Request a new recovery link and try again."); return; }
    await supabase.auth.signOut({ scope: "global" });
    window.location.replace("/login?status=password_reset");
  }

  return <AuthShell eyebrow="Secure password recovery" title={state === "failed" ? "This recovery link cannot continue." : "Choose a new password."} description={state === "failed" ? "The link may be invalid, expired, or already used." : "Supabase is validating the recovery session without exposing callback credentials."}>
    <div aria-live="polite">
      {state === "working" ? <p className="text-sm font-bold text-cyan-200">Validating recovery session…</p> : null}
      {state === "failed" ? <div className="space-y-3"><Link href="/forgot-password" className="inline-flex min-h-12 items-center rounded-full bg-fuchsia-500 px-6 text-sm font-extrabold text-white hover:bg-fuchsia-400">Request a new reset link</Link><p><Link href="/login" className="text-sm font-extrabold text-cyan-300 hover:text-cyan-200">Return to sign in</Link></p></div> : null}
    </div>
    {state === "ready" || state === "submitting" ? <form onSubmit={updateRecoveredPassword} className="mt-6 space-y-5"><div><label htmlFor="recovery-password" className="mb-2 block text-sm font-bold text-zinc-300">New password</label><input id="recovery-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={state === "submitting"} aria-describedby="recovery-password-help recovery-password-status" className="min-h-13 w-full rounded-[var(--radius-sm)] border border-white/10 bg-black/25 px-4 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20" /><p id="recovery-password-help" className="mt-2 text-xs leading-5 text-zinc-500">{passwordRequirements}</p></div><div><label htmlFor="recovery-password-confirmation" className="mb-2 block text-sm font-bold text-zinc-300">Confirm new password</label><input id="recovery-password-confirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={state === "submitting"} className="min-h-13 w-full rounded-[var(--radius-sm)] border border-white/10 bg-black/25 px-4 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20" /></div><button type="submit" disabled={state === "submitting"} className="min-h-12 rounded-full bg-fuchsia-500 px-6 text-sm font-extrabold text-white hover:bg-fuchsia-400 disabled:cursor-wait disabled:opacity-60">{state === "submitting" ? "Changing password…" : "Change password"}</button><p id="recovery-password-status" role="status" className="text-sm leading-6 text-rose-100">{message}</p></form> : null}
  </AuthShell>;
}
