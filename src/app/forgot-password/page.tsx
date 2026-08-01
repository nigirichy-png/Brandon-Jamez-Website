import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  const configured = isSupabaseConfigured();
  return <AuthShell eyebrow="Account recovery" title="Reset access safely." description="Request a private, time-limited password recovery message without revealing whether an account exists.">
    <span className={`eyebrow inline-flex rounded-full border px-3 py-2 ${configured ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : "border-amber-300/25 bg-amber-300/10 text-amber-200"}`}>{configured ? "Secure recovery available" : "Not configured"}</span>
    <h2 className="font-display mt-5 text-4xl font-bold tracking-tight text-white">Request a reset</h2>
    <p className="mt-3 leading-7 text-zinc-400">The link expires and can be used only through a valid Supabase recovery session.</p>
    <ForgotPasswordForm configured={configured} />
    <p className="mt-5 text-sm text-zinc-400">Remembered your password? <Link href="/login" className="font-extrabold text-cyan-300 hover:text-cyan-200">Return to sign in</Link></p>
  </AuthShell>;
}
