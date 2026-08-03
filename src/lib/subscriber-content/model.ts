import type { Database } from "@/lib/supabase/types";

export type SubscriberPostStatus = Database["public"]["Enums"]["cms_content_status"];
export type SubscriberMediaType = Database["public"]["Enums"]["subscriber_media_type"];

export type SubscriberPostSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  status: SubscriberPostStatus;
  published_at: string | null;
};

export type SubscriberPostDetail = SubscriberPostSummary & {
  body: string;
  media_url: string | null;
  media_type: SubscriberMediaType | null;
};

export type AdminSubscriberPost = SubscriberPostDetail & {
  created_at: string;
  updated_at: string;
};
