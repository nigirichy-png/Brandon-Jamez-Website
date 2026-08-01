import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/types";

/**
 * Synchronizes auth cookies only. This does not authorize routes or data.
 * Page, Route Handler, Server Function, entitlement, and RLS checks remain required.
 */
export async function refreshSupabaseSession(request: NextRequest) {
  const config = getPublicSupabaseConfig();

  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headersToSet).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });

  // Validates/refreshes the cookie-backed JWT. It does not query application roles.
  await supabase.auth.getClaims();

  return response;
}
