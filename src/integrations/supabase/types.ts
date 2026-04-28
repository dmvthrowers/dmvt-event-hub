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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      event_occurrences: {
        Row: {
          all_day: boolean
          created_at: string
          end_at: string
          event_id: string
          id: string
          start_at: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          end_at: string
          event_id: string
          id?: string
          start_at: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          end_at?: string
          event_id?: string
          id?: string
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_occurrences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string
          age_label: string | null
          age_min: number | null
          all_day: boolean
          capacity: number | null
          city: string | null
          cost_amount: number | null
          cost_currency: string | null
          country: string | null
          created_at: string
          description: string
          end_date: string
          end_time: string | null
          expires_at: string
          id: string
          image_url: string | null
          info_url: string | null
          is_free: boolean
          latitude: number | null
          longitude: number | null
          organizer_name: string
          public_contact: string | null
          published_at: string | null
          recurrence: Database["public"]["Enums"]["recurrence_kind"]
          recurrence_until: string | null
          region: string | null
          skill_level: Database["public"]["Enums"]["skill_level"]
          slug: string
          start_date: string
          start_time: string | null
          status: Database["public"]["Enums"]["event_status"]
          submitter_email: string
          tags: string[] | null
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
          venue_name: string
          view_count: number
        }
        Insert: {
          address: string
          age_label?: string | null
          age_min?: number | null
          all_day?: boolean
          capacity?: number | null
          city?: string | null
          cost_amount?: number | null
          cost_currency?: string | null
          country?: string | null
          created_at?: string
          description: string
          end_date: string
          end_time?: string | null
          expires_at?: string
          id?: string
          image_url?: string | null
          info_url?: string | null
          is_free?: boolean
          latitude?: number | null
          longitude?: number | null
          organizer_name: string
          public_contact?: string | null
          published_at?: string | null
          recurrence?: Database["public"]["Enums"]["recurrence_kind"]
          recurrence_until?: string | null
          region?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"]
          slug: string
          start_date: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          submitter_email: string
          tags?: string[] | null
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          venue_name: string
          view_count?: number
        }
        Update: {
          address?: string
          age_label?: string | null
          age_min?: number | null
          all_day?: boolean
          capacity?: number | null
          city?: string | null
          cost_amount?: number | null
          cost_currency?: string | null
          country?: string | null
          created_at?: string
          description?: string
          end_date?: string
          end_time?: string | null
          expires_at?: string
          id?: string
          image_url?: string | null
          info_url?: string | null
          is_free?: boolean
          latitude?: number | null
          longitude?: number | null
          organizer_name?: string
          public_contact?: string | null
          published_at?: string | null
          recurrence?: Database["public"]["Enums"]["recurrence_kind"]
          recurrence_until?: string | null
          region?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"]
          slug?: string
          start_date?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          submitter_email?: string
          tags?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          venue_name?: string
          view_count?: number
        }
        Relationships: []
      }
      manage_tokens: {
        Row: {
          created_at: string
          event_id: string
          id: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          revoked_at?: string | null
          token: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "manage_tokens_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          event_id: string
          id: string
          reason: string
          reporter_email: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          reason: string
          reporter_email?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          reason?: string
          reporter_email?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      submitters: {
        Row: {
          banned: boolean
          banned_reason: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          submission_count: number
          updated_at: string
        }
        Insert: {
          banned?: boolean
          banned_reason?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          submission_count?: number
          updated_at?: string
        }
        Update: {
          banned?: boolean
          banned_reason?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          submission_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          event_id: string
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          event_id: string
          expires_at?: string
          id?: string
          token: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          event_id?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_tokens_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      event_status: "pending" | "published" | "expired" | "hidden"
      event_type: "workshop" | "meetup" | "contest"
      recurrence_kind: "none" | "weekly" | "biweekly" | "monthly_by_weekday"
      report_status: "open" | "resolved" | "dismissed"
      skill_level: "all" | "beginner" | "intermediate" | "advanced"
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
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      event_status: ["pending", "published", "expired", "hidden"],
      event_type: ["workshop", "meetup", "contest"],
      recurrence_kind: ["none", "weekly", "biweekly", "monthly_by_weekday"],
      report_status: ["open", "resolved", "dismissed"],
      skill_level: ["all", "beginner", "intermediate", "advanced"],
    },
  },
} as const
