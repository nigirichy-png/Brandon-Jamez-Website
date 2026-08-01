import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requirePublicSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/types";

/** Creates a new request-scoped client; never cache this client globally. */
export async function createServerSupabaseClient() {
  const { url, anonKey } = requirePublicSupabaseConfig("the server client");
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies. The Next.js Proxy refreshes
          // them; Server Functions and Route Handlers can apply writes directly.
        }
      },
    },
  });
}
