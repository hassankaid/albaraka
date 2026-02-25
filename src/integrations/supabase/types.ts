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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      calls: {
        Row: {
          assigned_to: string | null
          calendly_event_id: string | null
          canceled_at: string | null
          canceled_by: string | null
          cancellation_reason: string | null
          contact_id: string | null
          created_at: string | null
          duration_minutes: number | null
          event_type: string | null
          id: string
          lead_id: string | null
          notes: string | null
          outcome: string | null
          raw_email: string | null
          raw_full_name: string | null
          raw_phone: string | null
          rescheduled_from: string | null
          scheduled_at: string
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          calendly_event_id?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          cancellation_reason?: string | null
          contact_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          event_type?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          outcome?: string | null
          raw_email?: string | null
          raw_full_name?: string | null
          raw_phone?: string | null
          rescheduled_from?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          calendly_event_id?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          cancellation_reason?: string | null
          contact_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          event_type?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          outcome?: string | null
          raw_email?: string | null
          raw_full_name?: string | null
          raw_phone?: string | null
          rescheduled_from?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "calls_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "leads_enriched"
            referencedColumns: ["contact_call_id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number | null
          beneficiary_external: string | null
          beneficiary_user_id: string | null
          created_at: string | null
          id: string
          paid_at: string | null
          percentage: number
          role: string
          sale_id: string
          status: string | null
        }
        Insert: {
          amount?: number | null
          beneficiary_external?: string | null
          beneficiary_user_id?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          percentage: number
          role: string
          sale_id: string
          status?: string | null
        }
        Update: {
          amount?: number | null
          beneficiary_external?: string | null
          beneficiary_user_id?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          percentage?: number
          role?: string
          sale_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_beneficiary_user_id_fkey"
            columns: ["beneficiary_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_identifiers: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          identifier_type: string
          identifier_value: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          identifier_type: string
          identifier_value: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          identifier_type?: string
          identifier_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_identifiers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone_normalized: string | null
          phone_original: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone_normalized?: string | null
          phone_original?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone_normalized?: string | null
          phone_original?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          action: string
          created_at: string | null
          id: string
          lead_id: string
          new_value: string | null
          note: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          lead_id: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          lead_id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          apporteur_id: string | null
          assigned_at: string | null
          assigned_to: string | null
          contact_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          raw_email: string | null
          raw_full_name: string | null
          raw_phone: string | null
          source: string
          source_detail: string | null
          status: string
          systeme_io_id: string | null
          updated_at: string | null
        }
        Insert: {
          apporteur_id?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          raw_email?: string | null
          raw_full_name?: string | null
          raw_phone?: string | null
          source: string
          source_detail?: string | null
          status?: string
          systeme_io_id?: string | null
          updated_at?: string | null
        }
        Update: {
          apporteur_id?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          raw_email?: string | null
          raw_full_name?: string | null
          raw_phone?: string | null
          source?: string
          source_detail?: string | null
          status?: string
          systeme_io_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_apporteur_id_fkey"
            columns: ["apporteur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          can_add_instagram_leads: boolean | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_also_apporteur: boolean | null
          phone: string | null
          role: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          can_add_instagram_leads?: boolean | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_also_apporteur?: boolean | null
          phone?: string | null
          role?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          can_add_instagram_leads?: boolean | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_also_apporteur?: boolean | null
          phone?: string | null
          role?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount_ht: number
          call_id: string | null
          closed_by: string | null
          contact_id: string
          created_at: string | null
          id: string
          lead_id: string | null
          payment_status: string | null
          product: string
          sold_at: string | null
        }
        Insert: {
          amount_ht: number
          call_id?: string | null
          closed_by?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          lead_id?: string | null
          payment_status?: string | null
          product: string
          sold_at?: string | null
        }
        Update: {
          amount_ht?: number
          call_id?: string | null
          closed_by?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          lead_id?: string | null
          payment_status?: string | null
          product?: string
          sold_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "leads_enriched"
            referencedColumns: ["contact_call_id"]
          },
          {
            foreignKeyName: "sales_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      calls_enriched: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          calendly_event_id: string | null
          canceled_at: string | null
          canceled_by: string | null
          canceled_by_name: string | null
          cancellation_reason: string | null
          contact_email: string | null
          contact_full_name: string | null
          contact_id: string | null
          contact_phone: string | null
          created_at: string | null
          duration_minutes: number | null
          event_type: string | null
          event_type_label: string | null
          id: string | null
          lead_id: string | null
          notes: string | null
          outcome: string | null
          rescheduled_from: string | null
          scheduled_at: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "calls_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "leads_enriched"
            referencedColumns: ["contact_call_id"]
          },
        ]
      }
      contact_timeline: {
        Row: {
          contact_id: string | null
          event_date: string | null
          event_detail: string | null
          event_id: string | null
          event_status: string | null
          event_type: string | null
        }
        Relationships: []
      }
      leads_enriched: {
        Row: {
          apporteur_id: string | null
          apporteur_name: string | null
          assigned_at: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          contact_call_assigned_to: string | null
          contact_call_assigned_to_name: string | null
          contact_call_event_type: string | null
          contact_call_id: string | null
          contact_call_scheduled_at: string | null
          contact_call_status: string | null
          contact_email: string | null
          contact_full_name: string | null
          contact_id: string | null
          contact_phone: string | null
          created_at: string | null
          has_active_call: boolean | null
          id: string | null
          notes: string | null
          raw_email: string | null
          raw_full_name: string | null
          raw_phone: string | null
          source: string | null
          source_detail: string | null
          source_label: string | null
          status: string | null
          status_label: string | null
          systeme_io_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_assigned_to_fkey"
            columns: ["contact_call_assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_apporteur_id_fkey"
            columns: ["apporteur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      find_or_create_contact: {
        Args: { p_email: string; p_full_name?: string; p_phone: string }
        Returns: string
      }
      get_user_role: { Args: never; Returns: string }
      normalize_phone_e164: { Args: { phone: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
