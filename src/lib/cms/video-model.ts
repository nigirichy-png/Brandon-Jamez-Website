import type { Database } from "@/lib/supabase/types";

export type CmsVideoPlatform = Database["public"]["Enums"]["cms_video_platform"];
export type CmsContentStatus = Database["public"]["Enums"]["cms_content_status"];

export type CmsVideo = {
  id: string;
  title: string;
  short_description: string;
  platform: CmsVideoPlatform;
  video_url: string;
  category: string | null;
  featured: boolean;
  display_order: number;
  status: CmsContentStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicCmsVideo = Omit<CmsVideo, "status">;
