import "server-only";

import type { CmsVideo, PublicCmsVideo } from "@/lib/cms/video-model";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type { CmsVideo, PublicCmsVideo } from "@/lib/cms/video-model";

export async function listAdminCmsVideos(): Promise<CmsVideo[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_list_cms_videos");
  if (error) throw new Error("cms_video_list_unavailable");
  return (data ?? []) as CmsVideo[];
}

export async function listPublishedCmsVideos(): Promise<PublicCmsVideo[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("list_published_cms_videos");
  if (error) throw new Error("published_videos_unavailable");
  return (data ?? []) as PublicCmsVideo[];
}
