import "server-only";

import { requirePublicSupabaseConfig } from "@/lib/supabase/config";

export type ServiceRoleSupabaseConfig = Readonly<{
  url: string;
  serviceRoleKey: string;
}>;

const SERVICE_ROLE_PLACEHOLDER = "server-only-placeholder";

function usableServiceRoleKey(value: string | undefined): value is string {
  return Boolean(
    value
    && value !== SERVICE_ROLE_PLACEHOLDER
    && !value.includes("placeholder"),
  );
}

export function requireServiceRoleSupabaseConfig(): ServiceRoleSupabaseConfig {
  const { url } = requirePublicSupabaseConfig("the service-role client");
  const serviceRoleKey = [
    process.env.SUPABASE_SECRET_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ].find(usableServiceRoleKey);

  if (!serviceRoleKey) {
    throw new Error(
      "A Supabase server secret is not configured. Set it only in a trusted server environment before requesting an admin client.",
    );
  }

  return { url, serviceRoleKey };
}
