import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const allowedTypes = new Set<EmailOtpType>(["email", "signup", "invite", "magiclink", "recovery", "email_change"]);

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type");
  const code = request.nextUrl.searchParams.get("code");
  const successUrl = new URL("/account", request.url);
  const browserCompletionUrl = new URL("/auth/complete", request.url);
  const errorUrl = new URL("/auth/error?code=confirmation_failed", request.url);

  if (!isSupabaseConfigured()) return NextResponse.redirect(errorUrl);

  try {
    const supabase = await createServerSupabaseClient();

    if (tokenHash || rawType) {
      if (!tokenHash || tokenHash.length > 4096 || !rawType || !allowedTypes.has(rawType as EmailOtpType)) {
        return NextResponse.redirect(errorUrl);
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: rawType as EmailOtpType,
      });
      return NextResponse.redirect(error ? errorUrl : successUrl);
    }

    if (code) {
      if (code.length > 4096) return NextResponse.redirect(errorUrl);
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return NextResponse.redirect(error ? errorUrl : successUrl);
    }

    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return NextResponse.redirect(successUrl);

    // Supabase's unchanged hosted template returns an implicit session in the
    // URL fragment. Fragments never reach the server, so a dedicated browser
    // boundary completes that official flow without application-level parsing.
    return NextResponse.redirect(browserCompletionUrl);
  } catch {
    // A generic error page avoids exposing provider or token details.
  }
  return NextResponse.redirect(errorUrl);
}
