export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_restrictions: {
        Row: {
          blocked: boolean
          blocked_at: string | null
          blocked_by: string | null
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked?: boolean
          blocked_at?: string | null
          blocked_by?: string | null
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked?: boolean
          blocked_at?: string | null
          blocked_by?: string | null
          reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      age_verifications: {
        Row: {
          age_verified: boolean
          created_at: string
          expires_at: string | null
          provider: string
          status: Database["public"]["Enums"]["age_verification_status"]
          updated_at: string
          user_id: string
          verification_reference: string
          verified_at: string | null
        }
        Insert: {
          age_verified?: boolean
          created_at?: string
          expires_at?: string | null
          provider: string
          status?: Database["public"]["Enums"]["age_verification_status"]
          updated_at?: string
          user_id: string
          verification_reference: string
          verified_at?: string | null
        }
        Update: {
          age_verified?: boolean
          created_at?: string
          expires_at?: string | null
          provider?: string
          status?: Database["public"]["Enums"]["age_verification_status"]
          updated_at?: string
          user_id?: string
          verification_reference?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          actor_role_snapshot: Database["public"]["Enums"]["app_role"][]
          actor_user_id: string | null
          id: number
          metadata: Json
          occurred_at: string
          result: string
          target_label_snapshot: string | null
          target_resource_id: string | null
          target_type: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_role_snapshot?: Database["public"]["Enums"]["app_role"][]
          actor_user_id?: string | null
          id?: never
          metadata?: Json
          occurred_at?: string
          result: string
          target_label_snapshot?: string | null
          target_resource_id?: string | null
          target_type: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_role_snapshot?: Database["public"]["Enums"]["app_role"][]
          actor_user_id?: string | null
          id?: never
          metadata?: Json
          occurred_at?: string
          result?: string
          target_label_snapshot?: string | null
          target_resource_id?: string | null
          target_type?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      cms_videos: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          display_order: number
          featured: boolean
          id: string
          platform: Database["public"]["Enums"]["cms_video_platform"]
          published_at: string | null
          short_description: string
          status: Database["public"]["Enums"]["cms_content_status"]
          title: string
          updated_at: string
          updated_by: string | null
          video_url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          featured?: boolean
          id?: string
          platform: Database["public"]["Enums"]["cms_video_platform"]
          published_at?: string | null
          short_description?: string
          status?: Database["public"]["Enums"]["cms_content_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
          video_url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          featured?: boolean
          id?: string
          platform?: Database["public"]["Enums"]["cms_video_platform"]
          published_at?: string | null
          short_description?: string
          status?: Database["public"]["Enums"]["cms_content_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
          video_url?: string
        }
        Relationships: []
      }
      live_chat_messages: {
        Row: {
          author_display_name: string
          author_key: string
          body: string
          created_at: string
          id: number
          session_id: string
          status: Database["public"]["Enums"]["live_chat_message_status"]
          updated_at: string
        }
        Insert: {
          author_display_name: string
          author_key: string
          body: string
          created_at?: string
          id?: never
          session_id: string
          status?: Database["public"]["Enums"]["live_chat_message_status"]
          updated_at?: string
        }
        Update: {
          author_display_name?: string
          author_key?: string
          body?: string
          created_at?: string
          id?: never
          session_id?: string
          status?: Database["public"]["Enums"]["live_chat_message_status"]
          updated_at?: string
        }
        Relationships: []
      }
      live_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          direct_playback_provider: string | null
          direct_playback_reference: string | null
          id: string
          is_current: boolean
          source: Database["public"]["Enums"]["live_source"]
          status: Database["public"]["Enums"]["live_status"]
          title: string
          updated_at: string
          updated_by: string | null
          youtube_video_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          direct_playback_provider?: string | null
          direct_playback_reference?: string | null
          id?: string
          is_current?: boolean
          source: Database["public"]["Enums"]["live_source"]
          status?: Database["public"]["Enums"]["live_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          direct_playback_provider?: string | null
          direct_playback_reference?: string | null
          id?: string
          is_current?: boolean
          source?: Database["public"]["Enums"]["live_source"]
          status?: Database["public"]["Enums"]["live_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      cms_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          location: string
          published_at: string | null
          starts_at: string
          status: Database["public"]["Enums"]["cms_event_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          location?: string
          published_at?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["cms_event_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          location?: string
          published_at?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["cms_event_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      moderation_case_status_history: {
        Row: {
          case_id: string
          changed_at: string
          changed_by: string | null
          from_status: Database["public"]["Enums"]["moderation_case_status"] | null
          id: number
          note: string | null
          to_status: Database["public"]["Enums"]["moderation_case_status"]
        }
        Insert: {
          case_id: string
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["moderation_case_status"] | null
          id?: never
          note?: string | null
          to_status: Database["public"]["Enums"]["moderation_case_status"]
        }
        Update: {
          case_id?: string
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["moderation_case_status"] | null
          id?: never
          note?: string | null
          to_status?: Database["public"]["Enums"]["moderation_case_status"]
        }
        Relationships: []
      }
      moderation_cases: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          created_by: string | null
          evidence_reference: string | null
          id: string
          severity: Database["public"]["Enums"]["moderation_case_severity"]
          source_type: string
          status: Database["public"]["Enums"]["moderation_case_status"]
          summary: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          evidence_reference?: string | null
          id?: string
          severity: Database["public"]["Enums"]["moderation_case_severity"]
          source_type: string
          status?: Database["public"]["Enums"]["moderation_case_status"]
          summary: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          evidence_reference?: string | null
          id?: string
          severity?: Database["public"]["Enums"]["moderation_case_severity"]
          source_type?: string
          status?: Database["public"]["Enums"]["moderation_case_status"]
          summary?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      subscriber_posts: {
        Row: {
          body: string
          content_image_path: string | null
          cover_image_path: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          media_type: Database["public"]["Enums"]["subscriber_media_type"] | null
          media_url: string | null
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["cms_content_status"]
          title: string
          updated_at: string
          video_path: string | null
        }
        Insert: {
          body: string
          content_image_path?: string | null
          cover_image_path?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          media_type?: Database["public"]["Enums"]["subscriber_media_type"] | null
          media_url?: string | null
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["cms_content_status"]
          title: string
          updated_at?: string
          video_path?: string | null
        }
        Update: {
          body?: string
          content_image_path?: string | null
          cover_image_path?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          media_type?: Database["public"]["Enums"]["subscriber_media_type"] | null
          media_url?: string | null
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["cms_content_status"]
          title?: string
          updated_at?: string
          video_path?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          event_created_at: string
          event_type: string
          processed_at: string
          processing_result: string
          stripe_customer_id: string | null
          stripe_event_id: string
          stripe_subscription_id: string | null
          target_user_id: string | null
        }
        Insert: {
          event_created_at: string
          event_type: string
          processed_at?: string
          processing_result: string
          stripe_customer_id?: string | null
          stripe_event_id: string
          stripe_subscription_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          event_created_at?: string
          event_type?: string
          processed_at?: string
          processing_result?: string
          stripe_customer_id?: string | null
          stripe_event_id?: string
          stripe_subscription_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          ended_at: string | null
          last_checkout_started_at: string | null
          last_synced_at: string | null
          provider: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
          webhook_event_created_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          last_checkout_started_at?: string | null
          last_synced_at?: string | null
          provider: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
          webhook_event_created_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          last_checkout_started_at?: string | null
          last_synced_at?: string | null
          provider?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
          webhook_event_created_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_assign_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_target_user_id: string
        }
        Returns: boolean
      }
      admin_block_account: {
        Args: { p_reason: string; p_target_user_id: string }
        Returns: boolean
      }
      admin_create_cms_video: {
        Args: {
          p_category?: string
          p_platform: Database["public"]["Enums"]["cms_video_platform"]
          p_short_description: string
          p_title: string
          p_video_url: string
        }
        Returns: string
      }
      admin_create_subscriber_post: {
        Args: {
          p_body: string
          p_cover_image_url: string | null
          p_excerpt: string | null
          p_media_type: Database["public"]["Enums"]["subscriber_media_type"] | null
          p_media_url: string | null
          p_slug: string
          p_status: Database["public"]["Enums"]["cms_content_status"]
          p_title: string
        }
        Returns: string
      }
      admin_delete_cms_video: {
        Args: { p_expected_updated_at: string; p_video_id: string }
        Returns: boolean
      }
      admin_delete_subscriber_post: {
        Args: { p_expected_updated_at: string; p_post_id: string }
        Returns: boolean
      }
      admin_list_cms_videos: {
        Args: never
        Returns: {
          category: string
          created_at: string
          display_order: number
          featured: boolean
          id: string
          platform: Database["public"]["Enums"]["cms_video_platform"]
          published_at: string
          short_description: string
          status: Database["public"]["Enums"]["cms_content_status"]
          title: string
          updated_at: string
          video_url: string
        }[]
      }
      admin_list_subscriber_posts: {
        Args: never
        Returns: {
          body: string
          bunny_video_file_name: string | null
          bunny_video_file_size: number | null
          bunny_video_id: string | null
          bunny_video_status: Database["public"]["Enums"]["bunny_video_status"] | null
          content_image_path: string | null
          cover_image_path: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          media_type: Database["public"]["Enums"]["subscriber_media_type"] | null
          media_url: string | null
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["cms_content_status"]
          title: string
          updated_at: string
          video_path: string | null
        }[]
      }
      admin_list_subscriber_bunny_videos: {
        Args: never
        Returns: {
          created_at: string
          description: string | null
          file_name: string
          file_size: number
          id: string
          mime_type: string
          provider_status: number | null
          provider_video_id: string
          publication_status: Database["public"]["Enums"]["cms_content_status"]
          published_at: string | null
          ready_at: string | null
          slug: string
          status: Database["public"]["Enums"]["bunny_video_status"]
          title: string
          updated_at: string
        }[]
      }
      admin_create_subscriber_bunny_video: {
        Args: { p_description: string; p_file_name: string; p_file_size: number; p_mime_type: string; p_provider_video_id: string; p_title: string }
        Returns: string
      }
      admin_update_subscriber_bunny_video: {
        Args: { p_description: string; p_expected_updated_at: string; p_publish: boolean; p_title: string; p_video_id: string }
        Returns: boolean
      }
      admin_delete_subscriber_bunny_video: {
        Args: { p_expected_updated_at: string; p_video_id: string }
        Returns: string
      }
      admin_remove_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_target_user_id: string
        }
        Returns: boolean
      }
      admin_reorder_cms_video: {
        Args: {
          p_display_order: number
          p_expected_updated_at: string
          p_video_id: string
        }
        Returns: boolean
      }
      admin_restore_account: {
        Args: { p_target_user_id: string }
        Returns: boolean
      }
      admin_set_cms_video_featured: {
        Args: {
          p_expected_updated_at: string
          p_featured: boolean
          p_video_id: string
        }
        Returns: boolean
      }
      admin_set_cms_video_publication: {
        Args: {
          p_expected_updated_at: string
          p_publish: boolean
          p_video_id: string
        }
        Returns: boolean
      }
      admin_set_subscriber_post_publication: {
        Args: {
          p_expected_updated_at: string
          p_post_id: string
          p_publish: boolean
        }
        Returns: boolean
      }
      admin_set_subscriber_post_image_path: {
        Args: {
          p_expected_updated_at: string
          p_kind: string
          p_path: string | null
          p_post_id: string
        }
        Returns: string | null
      }
      admin_update_cms_video: {
        Args: {
          p_category: string
          p_expected_updated_at: string
          p_platform: Database["public"]["Enums"]["cms_video_platform"]
          p_short_description: string
          p_title: string
          p_video_id: string
          p_video_url: string
        }
        Returns: boolean
      }
      admin_update_subscriber_post: {
        Args: {
          p_body: string
          p_cover_image_url: string | null
          p_excerpt: string | null
          p_expected_updated_at: string
          p_media_type: Database["public"]["Enums"]["subscriber_media_type"] | null
          p_media_url: string | null
          p_post_id: string
          p_slug: string
          p_status: Database["public"]["Enums"]["cms_content_status"]
          p_title: string
        }
        Returns: boolean
      }
      begin_own_stripe_checkout: {
        Args: never
        Returns: {
          has_active_access: boolean
          stripe_customer_id: string
        }[]
      }
      begin_own_stripe_portal: { Args: never; Returns: string }
      bind_own_stripe_customer: {
        Args: { p_stripe_customer_id: string }
        Returns: boolean
      }
      content_create_cms_event: {
        Args: {
          p_description: string
          p_location: string
          p_starts_at: string
          p_title: string
        }
        Returns: string
      }
      content_create_cms_video: {
        Args: {
          p_category?: string | null
          p_platform: Database["public"]["Enums"]["cms_video_platform"]
          p_short_description: string
          p_title: string
          p_video_url: string
        }
        Returns: string
      }
      content_create_public_bunny_video: {
        Args: { p_category: string; p_file_name: string; p_file_size: number; p_mime_type: string; p_provider_video_id: string; p_short_description: string; p_title: string }
        Returns: string
      }
      content_delete_cms_event: {
        Args: { p_event_id: string; p_expected_updated_at: string }
        Returns: boolean
      }
      content_delete_cms_video: {
        Args: { p_expected_updated_at: string; p_video_id: string }
        Returns: boolean
      }
      content_delete_public_bunny_video: {
        Args: { p_expected_updated_at: string; p_video_id: string }
        Returns: string
      }
      content_list_cms_events: {
        Args: never
        Returns: {
          created_at: string
          description: string
          id: string
          location: string
          published_at: string | null
          starts_at: string
          status: Database["public"]["Enums"]["cms_event_status"]
          title: string
          updated_at: string
        }[]
      }
      content_list_cms_videos: {
        Args: never
        Returns: {
          category: string | null
          created_at: string
          display_order: number
          featured: boolean
          id: string
          platform: Database["public"]["Enums"]["cms_video_platform"]
          published_at: string | null
          short_description: string
          status: Database["public"]["Enums"]["cms_content_status"]
          title: string
          updated_at: string
          video_url: string
        }[]
      }
      content_list_public_bunny_videos: {
        Args: never
        Returns: {
          category: string | null
          created_at: string
          display_order: number
          featured: boolean
          file_name: string
          file_size: number
          id: string
          mime_type: string
          provider_status: number | null
          provider_video_id: string
          publication_status: Database["public"]["Enums"]["cms_content_status"]
          published_at: string | null
          ready_at: string | null
          short_description: string | null
          status: Database["public"]["Enums"]["bunny_video_status"]
          title: string
          updated_at: string
        }[]
      }
      content_reorder_cms_video: {
        Args: {
          p_display_order: number
          p_expected_updated_at: string
          p_video_id: string
        }
        Returns: boolean
      }
      content_set_cms_event_archived: {
        Args: {
          p_archive: boolean
          p_event_id: string
          p_expected_updated_at: string
        }
        Returns: boolean
      }
      content_set_cms_event_publication: {
        Args: {
          p_event_id: string
          p_expected_updated_at: string
          p_publish: boolean
        }
        Returns: boolean
      }
      content_set_cms_video_featured: {
        Args: {
          p_expected_updated_at: string
          p_featured: boolean
          p_video_id: string
        }
        Returns: boolean
      }
      content_set_cms_video_publication: {
        Args: {
          p_expected_updated_at: string
          p_publish: boolean
          p_video_id: string
        }
        Returns: boolean
      }
      content_update_cms_event: {
        Args: {
          p_description: string
          p_event_id: string
          p_expected_updated_at: string
          p_location: string
          p_starts_at: string
          p_title: string
        }
        Returns: boolean
      }
      content_update_cms_video: {
        Args: {
          p_category: string | null
          p_expected_updated_at: string
          p_platform: Database["public"]["Enums"]["cms_video_platform"]
          p_short_description: string
          p_title: string
          p_video_id: string
          p_video_url: string
        }
        Returns: boolean
      }
      content_update_public_bunny_video: {
        Args: { p_category: string; p_expected_updated_at: string; p_publish: boolean; p_short_description: string; p_title: string; p_video_id: string }
        Returns: boolean
      }
      get_own_stripe_billing_context: {
        Args: never
        Returns: {
          cancel_at_period_end: boolean
          current_period_end: string
          has_active_access: boolean
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string
        }[]
      }
      get_published_subscriber_post: {
        Args: { p_slug: string }
        Returns: {
          body: string
          cover_image_url: string | null
          excerpt: string | null
          has_content_image: boolean
          has_cover_image: boolean
          has_bunny_video: boolean
          has_private_video: boolean
          id: string
          media_type: Database["public"]["Enums"]["subscriber_media_type"] | null
          media_url: string | null
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["cms_content_status"]
          title: string
        }[]
      }
      has_active_paid_subscription: { Args: never; Returns: boolean }
      list_published_cms_videos: {
        Args: never
        Returns: {
          category: string
          created_at: string
          display_order: number
          featured: boolean
          id: string
          platform: Database["public"]["Enums"]["cms_video_platform"]
          published_at: string
          short_description: string
          title: string
          updated_at: string
          video_url: string
        }[]
      }
      list_published_subscriber_posts: {
        Args: never
        Returns: {
          cover_image_url: string | null
          excerpt: string | null
          has_cover_image: boolean
          id: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["cms_content_status"]
          title: string
        }[]
      }
      list_published_public_bunny_videos: {
        Args: never
        Returns: {
          category: string | null
          created_at: string
          display_order: number
          featured: boolean
          id: string
          published_at: string | null
          short_description: string
          title: string
          updated_at: string
          video_url: string
        }[]
      }
      list_published_subscriber_bunny_videos: {
        Args: never
        Returns: {
          description: string | null
          id: string
          published_at: string | null
          slug: string
          title: string
        }[]
      }
      list_published_cms_events: {
        Args: never
        Returns: {
          description: string
          id: string
          location: string
          published_at: string | null
          starts_at: string
          title: string
          updated_at: string
        }[]
      }
      moderator_create_case: {
        Args: {
          p_category: string
          p_evidence_reference: string | null
          p_severity: Database["public"]["Enums"]["moderation_case_severity"]
          p_source_type: string
          p_summary: string
          p_title: string
        }
        Returns: string
      }
      moderator_delete_case: {
        Args: { p_case_id: string; p_expected_updated_at: string }
        Returns: boolean
      }
      moderator_list_case_history: {
        Args: never
        Returns: {
          case_id: string
          changed_at: string
          changed_by_label: string
          from_status: Database["public"]["Enums"]["moderation_case_status"] | null
          id: number
          note: string | null
          to_status: Database["public"]["Enums"]["moderation_case_status"]
        }[]
      }
      moderator_list_cases: {
        Args: never
        Returns: {
          assigned_to_current_user: boolean
          assigned_to_label: string | null
          category: string
          created_at: string
          evidence_reference: string | null
          id: string
          severity: Database["public"]["Enums"]["moderation_case_severity"]
          source_type: string
          status: Database["public"]["Enums"]["moderation_case_status"]
          summary: string
          title: string
          updated_at: string
        }[]
      }
      moderator_set_case_assignment: {
        Args: {
          p_assign_to_self: boolean
          p_case_id: string
          p_expected_updated_at: string
        }
        Returns: boolean
      }
      moderator_set_case_status: {
        Args: {
          p_case_id: string
          p_expected_updated_at: string
          p_note: string | null
          p_status: Database["public"]["Enums"]["moderation_case_status"]
        }
        Returns: boolean
      }
      moderator_update_case: {
        Args: {
          p_case_id: string
          p_category: string
          p_evidence_reference: string | null
          p_expected_updated_at: string
          p_severity: Database["public"]["Enums"]["moderation_case_severity"]
          p_source_type: string
          p_summary: string
          p_title: string
        }
        Returns: boolean
      }
      admin_configure_live_session: {
        Args: {
          p_direct_provider: string | null
          p_direct_reference: string | null
          p_expected_updated_at: string | null
          p_session_id: string | null
          p_source: Database["public"]["Enums"]["live_source"]
          p_title: string
          p_youtube_video_id: string | null
        }
        Returns: string
      }
      admin_set_live_status: {
        Args: { p_expected_updated_at: string; p_session_id: string; p_status: Database["public"]["Enums"]["live_status"] }
        Returns: boolean
      }
      get_current_live_session: {
        Args: never
        Returns: {
          direct_playback_provider: string | null
          direct_playback_reference: string | null
          id: string
          source: Database["public"]["Enums"]["live_source"]
          status: Database["public"]["Enums"]["live_status"]
          title: string
          updated_at: string
          youtube_video_id: string | null
        }[]
      }
      list_live_chat_messages: {
        Args: { p_before_id?: number | null; p_limit?: number; p_session_id: string }
        Returns: {
          author_display_name: string
          author_key: string
          body: string
          created_at: string
          id: number
          session_id: string
          status: Database["public"]["Enums"]["live_chat_message_status"]
          updated_at: string
        }[]
      }
      is_current_live_session: { Args: { p_session_id: string }; Returns: boolean }
      moderator_delete_live_chat_message: { Args: { p_message_id: number }; Returns: boolean }
      moderator_restrict_live_chat_user: {
        Args: { p_author_key: string; p_duration_seconds?: number | null; p_kind: string; p_session_id: string }
        Returns: boolean
      }
      moderator_unrestrict_live_chat_user: { Args: { p_author_key: string; p_session_id: string }; Returns: boolean }
      send_live_chat_message: { Args: { p_body: string; p_session_id: string }; Returns: number }
      record_youtube_moderation_action: {
        Args: { p_action: string; p_live_chat_id: string; p_metadata?: Json; p_target_label: string }
        Returns: boolean
      }
      resolve_subscriber_media_path: {
        Args: {
          p_allow_draft?: boolean
          p_kind: string
          p_post_id: string
          p_slug: string
        }
        Returns: string | null
      }
      resolve_subscriber_bunny_video: {
        Args: { p_allow_draft?: boolean; p_slug: string; p_video_id: string }
        Returns: string | null
      }
      resolve_public_bunny_video: {
        Args: { p_allow_draft?: boolean; p_video_id: string }
        Returns: string | null
      }
      service_update_public_bunny_video_status: {
        Args: {
          p_provider_status: number
          p_provider_video_id: string
          p_status: Database["public"]["Enums"]["bunny_video_status"]
        }
        Returns: boolean
      }
      service_update_subscriber_bunny_video_status: {
        Args: {
          p_provider_status: number
          p_provider_video_id: string
          p_status: Database["public"]["Enums"]["bunny_video_status"]
        }
        Returns: boolean
      }
      process_stripe_subscription_event: {
        Args: {
          p_cancel_at_period_end?: boolean
          p_canceled_at?: string
          p_current_period_end?: string
          p_current_period_start?: string
          p_ended_at?: string
          p_event_created_at: string
          p_event_id: string
          p_event_type: string
          p_processing_result: string
          p_status?: Database["public"]["Enums"]["subscription_status"]
          p_stripe_customer_id?: string
          p_stripe_price_id?: string
          p_stripe_subscription_id?: string
          p_user_id?: string
        }
        Returns: string
      }
      record_own_email_change_request: { Args: never; Returns: boolean }
      update_own_display_name: {
        Args: { p_display_name: string }
        Returns: boolean
      }
    }
    Enums: {
      age_verification_status:
        | "pending"
        | "verified"
        | "failed"
        | "expired"
        | "revoked"
      app_role: "subscriber" | "moderator" | "content_manager" | "admin"
      bunny_video_status: "pending" | "uploading" | "processing" | "ready" | "failed"
      cms_content_status: "draft" | "published"
      cms_event_status: "draft" | "published" | "archived"
      cms_video_platform: "youtube" | "rumble" | "kick"
      live_chat_message_status: "visible" | "deleted"
      live_source: "youtube" | "direct"
      live_status: "offline" | "scheduled" | "live" | "ended"
      moderation_case_severity: "low" | "medium" | "high"
      moderation_case_status:
        | "pending"
        | "in_review"
        | "escalated"
        | "reviewed"
        | "archived"
      subscriber_media_type: "image" | "video" | "embed"
      subscription_status:
        | "inactive"
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "active"
        | "past_due"
        | "unpaid"
        | "canceled"
        | "paused"
        | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      age_verification_status: [
        "pending",
        "verified",
        "failed",
        "expired",
        "revoked",
      ],
      app_role: ["subscriber", "moderator", "content_manager", "admin"],
      bunny_video_status: ["pending", "uploading", "processing", "ready", "failed"],
      cms_content_status: ["draft", "published"],
      cms_video_platform: ["youtube", "rumble", "kick"],
      subscriber_media_type: ["image", "video", "embed"],
      subscription_status: [
        "inactive",
        "incomplete",
        "incomplete_expired",
        "trialing",
        "active",
        "past_due",
        "unpaid",
        "canceled",
        "paused",
        "expired",
      ],
    },
  },
} as const
