import "server-only";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import type { CmsVideo, PublicCmsVideo } from "@/lib/cms/video-model";
import { requirePublicSupabaseConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type { CmsVideo, PublicCmsVideo } from "@/lib/cms/video-model";

export async function listAdminCmsVideos(): Promise<CmsVideo[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_list_cms_videos");
  if (error) throw new Error("cms_video_list_unavailable");
  return (data ?? []) as CmsVideo[];
}

export async function listStaffCmsVideos(): Promise<CmsVideo[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("content_list_cms_videos");
  if (error) throw new Error("cms_video_list_unavailable");
  return (data ?? []) as CmsVideo[];
}

const loadPublishedCmsVideos = unstable_cache(async (): Promise<PublicCmsVideo[]> => {
  const { url, anonKey } = requirePublicSupabaseConfig("the public video feed");
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.rpc("list_published_cms_videos");
  if (error) throw new Error("published_videos_unavailable");
  return (data ?? []) as PublicCmsVideo[];
}, ["published-cms-videos-v1"], { revalidate: 60, tags: ["published-cms-videos"] });

export async function listPublishedCmsVideos(): Promise<PublicCmsVideo[]> {
  return loadPublishedCmsVideos();
}
