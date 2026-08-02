export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
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
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          provider: string
          provider_customer_reference: string | null
          provider_subscription_reference: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          provider: string
          provider_customer_reference?: string | null
          provider_subscription_reference?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          provider?: string
          provider_customer_reference?: string | null
          provider_subscription_reference?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
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
      admin_delete_cms_video: {
        Args: { p_expected_updated_at: string; p_video_id: string }
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
      cms_content_status: "draft" | "published"
      cms_video_platform: "youtube" | "rumble" | "kick"
      subscription_status:
        | "inactive"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
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
      cms_content_status: ["draft", "published"],
      cms_video_platform: ["youtube", "rumble", "kick"],
      subscription_status: [
        "inactive",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "expired",
      ],
    },
  },
} as const
