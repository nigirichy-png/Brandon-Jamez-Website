import "server-only";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import { requirePublicSupabaseConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AdminPublicBunnyVideo, PublicBunnyVideo } from "./model";

export async function listStaffPublicBunnyVideos(): Promise<AdminPublicBunnyVideo[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("content_list_public_bunny_videos");
  if (error) throw new Error("public_bunny_video_list_unavailable");
  return (data ?? []) as AdminPublicBunnyVideo[];
}

const loadPublishedPublicBunnyVideos = unstable_cache(async (): Promise<PublicBunnyVideo[]> => {
  const { url, anonKey } = requirePublicSupabaseConfig("the public Bunny video feed");
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.rpc("list_published_public_bunny_videos");
  if (error) throw new Error("published_public_bunny_videos_unavailable");
  return ((data ?? []) as Array<Omit<PublicBunnyVideo, "platform">>).map((video) => ({ ...video, platform: "bunny" as const }));
}, ["published-public-bunny-videos-v1"], { revalidate: 60, tags: ["published-public-bunny-videos"] });

export async function listPublishedPublicBunnyVideos(): Promise<PublicBunnyVideo[]> {
  return loadPublishedPublicBunnyVideos();
}
