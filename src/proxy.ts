import type { NextRequest } from "next/server";

import { refreshSupabaseSession } from "@/lib/supabase/proxy";

/** Next.js 16 Proxy: cookie synchronization only, never authorization. */
export async function proxy(request: NextRequest) {
  return refreshSupabaseSession(request);
}

export const config = {
  matcher: [
    "/account/:path*",
    "/admin/:path*",
    "/content/:path*",
    "/member/:path*",
    "/mod/:path*",
    "/moderation-hub/:path*",
    "/subscriber/:path*",
    "/subscribe/:path*",
    "/api/:path*",
    "/auth/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify-age",
  ],
};
