import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CmsEvent, PublicCmsEvent } from "./model";

export async function listStaffCmsEvents(): Promise<CmsEvent[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("content_list_cms_events");
  if (error) throw new Error("cms_events_unavailable");
  return (data ?? []) as CmsEvent[];
}

export async function listPublishedCmsEvents(): Promise<PublicCmsEvent[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("list_published_cms_events");
  if (error) throw new Error("published_events_unavailable");
  return (data ?? []) as PublicCmsEvent[];
}
