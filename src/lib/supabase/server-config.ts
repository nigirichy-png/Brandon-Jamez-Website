import "server-only";

import { requirePublicSupabaseConfig } from "@/lib/supabase/config";

export type ServiceRoleSupabaseConfig = Readonly<{
  url: string;
  serviceRoleKey: string;
}>;

const SERVICE_ROLE_PLACEHOLDER = "server-only-placeholder";

export function requireServiceRoleSupabaseConfig(): ServiceRoleSupabaseConfig {
  const { url } = requirePublicSupabaseConfig("the service-role client");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !serviceRoleKey ||
    serviceRoleKey === SERVICE_ROLE_PLACEHOLDER ||
    serviceRoleKey.includes("placeholder")
  ) {
    throw new Error(
      "The Supabase service-role key is not configured. Set it only in a trusted server environment before requesting an admin client.",
    );
  }

  return { url, serviceRoleKey };
}
