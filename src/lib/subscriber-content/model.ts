import type { Database } from "@/lib/supabase/types";

export type SubscriberPostStatus = Database["public"]["Enums"]["cms_content_status"];
export type SubscriberMediaType = Database["public"]["Enums"]["subscriber_media_type"];

export type SubscriberPostSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  has_cover_image: boolean;
  status: SubscriberPostStatus;
  published_at: string | null;
};

export type SubscriberPostDetail = SubscriberPostSummary & {
  body: string;
  media_url: string | null;
  media_type: SubscriberMediaType | null;
  has_content_image: boolean;
  has_private_video: boolean;
  has_bunny_video: boolean;
};

export type AdminSubscriberPost = Omit<SubscriberPostDetail, "has_cover_image" | "has_content_image" | "has_private_video" | "has_bunny_video"> & {
  cover_image_path: string | null;
  content_image_path: string | null;
  video_path: string | null;
  bunny_video_id: string | null;
  bunny_video_status: Database["public"]["Enums"]["bunny_video_status"] | null;
  bunny_video_file_name: string | null;
  bunny_video_file_size: number | null;
  created_at: string;
  updated_at: string;
};

export type SubscriberVideoSummary = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  published_at: string | null;
};

export type AdminSubscriberVideo = SubscriberVideoSummary & {
  publication_status: SubscriberPostStatus;
  provider_video_id: string;
  status: Database["public"]["Enums"]["bunny_video_status"];
  provider_status: number | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
  ready_at: string | null;
};
