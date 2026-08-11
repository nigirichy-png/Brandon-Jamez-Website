import type { Database } from "@/lib/supabase/types";

export type PublicVideoPlatform = Database["public"]["Enums"]["cms_video_platform"] | "bunny";

export type PublicBunnyVideo = {
  id: string;
  title: string;
  short_description: string;
  platform: "bunny";
  video_url: string;
  category: string | null;
  featured: boolean;
  display_order: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminPublicBunnyVideo = Omit<PublicBunnyVideo, "platform" | "video_url" | "short_description"> & {
  short_description: string | null;
  publication_status: Database["public"]["Enums"]["cms_content_status"];
  provider_video_id: string;
  status: Database["public"]["Enums"]["bunny_video_status"];
  provider_status: number | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  ready_at: string | null;
};
