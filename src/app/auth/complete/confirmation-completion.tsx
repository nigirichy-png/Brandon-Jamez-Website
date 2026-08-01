"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { createImplicitConfirmationClient } from "@/lib/supabase/implicit-browser";

type CompletionState = "working" | "sign_in" | "failed";

export function ConfirmationCompletion() {
  const [state, setState] = useState<CompletionState>("working");

  useEffect(() => {
    let active = true;

    async function completeConfirmation() {
      try {
        const supabase = createImplicitConfirmationClient();
        const { data, error } = await supabase.auth.getUser();

        // The SDK consumes the hosted fragment. Clear any remaining fragment
        // without reading it so callback values cannot remain in the address bar.
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);

        if (!active) return;
        if (!error && data.user) {
          window.location.replace("/account");
          return;
        }
        setState("sign_in");
      } catch {
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
        if (active) setState("failed");
      }
    }

    void completeConfirmation();
    return () => {
      active = false;
    };
  }, []);

  const title = state === "working" ? "Completing confirmation" : state === "sign_in" ? "Continue by signing in" : "Confirmation could not continue";
  const description = state === "working"
    ? "Your confirmation is being checked securely."
    : state === "sign_in"
      ? "Your email may already be confirmed, but this browser does not have a local session. Sign in to continue."
      : "The confirmation link could not be accepted. It may be invalid, expired, or already used.";

  return (
    <AuthShell eyebrow="Secure account confirmation" title={title} description={description}>
      <div aria-live="polite">
        {state === "working" ? <p className="text-sm font-bold text-cyan-200">Please wait…</p> : null}
        {state !== "working" ? (
          <Link href="/login" className="inline-flex min-h-12 items-center rounded-full bg-fuchsia-500 px-6 text-sm font-extrabold text-white hover:bg-fuchsia-400">
            Go to sign in
          </Link>
        ) : null}
      </div>
    </AuthShell>
  );
}
