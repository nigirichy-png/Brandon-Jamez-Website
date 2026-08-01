import { type NextRequest, NextResponse } from "next/server";

import { createRecoveryMarker, recoveryCookieName, recoveryMarkerMaxAge } from "@/lib/auth/recovery-marker";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type");
  const code = request.nextUrl.searchParams.get("code");
  const errorUrl = new URL("/auth/error?code=recovery_failed", request.url);
  const browserCompletionUrl = new URL("/auth/recovery/complete", request.url);
  if (!isSupabaseConfigured()) return NextResponse.redirect(errorUrl);

  try {
    const supabase = await createServerSupabaseClient();
    let accepted = false;

    if (tokenHash || rawType) {
      if (!tokenHash || tokenHash.length > 4096 || rawType !== "recovery") return NextResponse.redirect(errorUrl);
      const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
      accepted = !result.error;
    } else if (code) {
      if (code.length > 4096) return NextResponse.redirect(errorUrl);
      const result = await supabase.auth.exchangeCodeForSession(code);
      accepted = !result.error;
    } else {
      // The unchanged hosted template may return an implicit recovery fragment,
      // which is visible only to the browser and must be consumed by the SDK.
      return NextResponse.redirect(browserCompletionUrl);
    }

    if (!accepted) return NextResponse.redirect(errorUrl);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return NextResponse.redirect(errorUrl);

    const response = NextResponse.redirect(new URL("/reset-password", request.url));
    response.cookies.set(recoveryCookieName, createRecoveryMarker(data.user.id), {
      httpOnly: true,
      maxAge: recoveryMarkerMaxAge,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
    return response;
  } catch {
    return NextResponse.redirect(errorUrl);
  }
}
