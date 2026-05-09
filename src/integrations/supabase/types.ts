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
      access_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          performed_by: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          performed_by?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          performed_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_daily_kpis: {
        Row: {
          ai_feedback: string | null
          appointments: number
          created_at: string
          entry_date: string
          id: string
          messages_sent: number
          replies_received: number
          sales_made: number
          updated_at: string
          user_id: string
          videos_published: number
        }
        Insert: {
          ai_feedback?: string | null
          appointments?: number
          created_at?: string
          entry_date: string
          id?: string
          messages_sent?: number
          replies_received?: number
          sales_made?: number
          updated_at?: string
          user_id: string
          videos_published?: number
        }
        Update: {
          ai_feedback?: string | null
          appointments?: number
          created_at?: string
          entry_date?: string
          id?: string
          messages_sent?: number
          replies_received?: number
          sales_made?: number
          updated_at?: string
          user_id?: string
          videos_published?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_daily_kpis_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_objectives: {
        Row: {
          created_at: string
          daily_target: number
          id: string
          kpi_key: string
          updated_at: string
          weekly_target: number
        }
        Insert: {
          created_at?: string
          daily_target?: number
          id?: string
          kpi_key: string
          updated_at?: string
          weekly_target?: number
        }
        Update: {
          created_at?: string
          daily_target?: number
          id?: string
          kpi_key?: string
          updated_at?: string
          weekly_target?: number
        }
        Relationships: []
      }
      activity_weekly_recaps: {
        Row: {
          created_at: string
          dismissed_at: string | null
          id: string
          recap_text: string
          stats: Json
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          recap_text: string
          stats?: Json
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          recap_text?: string
          stats?: Json
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_weekly_recaps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          amount_spent: number
          campaign_id: string
          campaign_name: string
          channel: string | null
          clicks: number
          created_at: string
          date: string
          id: string
          impressions: number
          updated_at: string
        }
        Insert: {
          amount_spent?: number
          campaign_id: string
          campaign_name: string
          channel?: string | null
          clicks?: number
          created_at?: string
          date: string
          id?: string
          impressions?: number
          updated_at?: string
        }
        Update: {
          amount_spent?: number
          campaign_id?: string
          campaign_name?: string
          channel?: string | null
          clicks?: number
          created_at?: string
          date?: string
          id?: string
          impressions?: number
          updated_at?: string
        }
        Relationships: []
      }
      agent_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_knowledge_base_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          published_at: string | null
          target_roles: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          published_at?: string | null
          target_roles?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          published_at?: string | null
          target_roles?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      apporteur_invoices: {
        Row: {
          apporteur_id: string
          created_at: string | null
          generated_at: string | null
          id: string
          invoice_number: string
          paid_at: string | null
          pdf_url: string | null
          period_month: number
          period_year: number
          sent_at: string | null
          status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          apporteur_id: string
          created_at?: string | null
          generated_at?: string | null
          id?: string
          invoice_number: string
          paid_at?: string | null
          pdf_url?: string | null
          period_month: number
          period_year: number
          sent_at?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          apporteur_id?: string
          created_at?: string | null
          generated_at?: string | null
          id?: string
          invoice_number?: string
          paid_at?: string | null
          pdf_url?: string | null
          period_month?: number
          period_year?: number
          sent_at?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apporteur_invoices_apporteur_id_fkey"
            columns: ["apporteur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      call_activities: {
        Row: {
          action: string
          call_id: string
          created_at: string | null
          id: string
          new_value: string | null
          note: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          action: string
          call_id: string
          created_at?: string | null
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          action?: string
          call_id?: string
          created_at?: string | null
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_activities_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_activities_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          assigned_to: string | null
          calendly_event_id: string | null
          canceled_at: string | null
          canceled_by: string | null
          cancellation_reason: string | null
          closer_notes: string | null
          conference_date: string | null
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
          closer_notes?: string | null
          conference_date?: string | null
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
          closer_notes?: string | null
          conference_date?: string | null
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
        ]
      }
      chapitre_progress: {
        Row: {
          chapitre_id: string
          completed_at: string
          id: string
          time_spent_seconds: number
          user_id: string
        }
        Insert: {
          chapitre_id: string
          completed_at?: string
          id?: string
          time_spent_seconds?: number
          user_id: string
        }
        Update: {
          chapitre_id?: string
          completed_at?: string
          id?: string
          time_spent_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapitre_progress_chapitre_id_fkey"
            columns: ["chapitre_id"]
            isOneToOne: false
            referencedRelation: "formation_chapitres"
            referencedColumns: ["id"]
          },
        ]
      }
      chapitre_ressources: {
        Row: {
          chapitre_id: string
          created_at: string
          id: string
          ordre: number
          titre: string
          type: string
          url: string
          video_id: string | null
        }
        Insert: {
          chapitre_id: string
          created_at?: string
          id?: string
          ordre?: number
          titre: string
          type: string
          url: string
          video_id?: string | null
        }
        Update: {
          chapitre_id?: string
          created_at?: string
          id?: string
          ordre?: number
          titre?: string
          type?: string
          url?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapitre_ressources_chapitre_id_fkey"
            columns: ["chapitre_id"]
            isOneToOne: false
            referencedRelation: "formation_chapitres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapitre_ressources_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "chapitre_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      chapitre_videos: {
        Row: {
          chapitre_id: string
          created_at: string
          duree_secondes: number | null
          id: string
          notes: string | null
          ordre: number
          titre: string
          updated_at: string
          url: string | null
          vimeo_id: string | null
        }
        Insert: {
          chapitre_id: string
          created_at?: string
          duree_secondes?: number | null
          id?: string
          notes?: string | null
          ordre?: number
          titre: string
          updated_at?: string
          url?: string | null
          vimeo_id?: string | null
        }
        Update: {
          chapitre_id?: string
          created_at?: string
          duree_secondes?: number | null
          id?: string
          notes?: string | null
          ordre?: number
          titre?: string
          updated_at?: string
          url?: string | null
          vimeo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapitre_videos_chapitre_id_fkey"
            columns: ["chapitre_id"]
            isOneToOne: false
            referencedRelation: "formation_chapitres"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invoices: {
        Row: {
          amount: number
          client_address: string | null
          client_city: string | null
          client_country: string | null
          client_email: string | null
          client_name: string
          client_postal_code: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          email_sent_at: string | null
          email_sent_to: string | null
          html_path: string | null
          id: string
          invoice_number: string
          last_attempt_at: string | null
          last_error: string | null
          paid_at: string
          payment_id: string
          payment_number: number | null
          pdf_url: string | null
          product: string | null
          sale_id: string | null
          total_payments: number | null
        }
        Insert: {
          amount: number
          client_address?: string | null
          client_city?: string | null
          client_country?: string | null
          client_email?: string | null
          client_name: string
          client_postal_code?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          email_sent_at?: string | null
          email_sent_to?: string | null
          html_path?: string | null
          id?: string
          invoice_number: string
          last_attempt_at?: string | null
          last_error?: string | null
          paid_at: string
          payment_id: string
          payment_number?: number | null
          pdf_url?: string | null
          product?: string | null
          sale_id?: string | null
          total_payments?: number | null
        }
        Update: {
          amount?: number
          client_address?: string | null
          client_city?: string | null
          client_country?: string | null
          client_email?: string | null
          client_name?: string
          client_postal_code?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          email_sent_at?: string | null
          email_sent_to?: string | null
          html_path?: string | null
          id?: string
          invoice_number?: string
          last_attempt_at?: string | null
          last_error?: string | null
          paid_at?: string
          payment_id?: string
          payment_number?: number | null
          pdf_url?: string | null
          product?: string | null
          sale_id?: string | null
          total_payments?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_daily_logs: {
        Row: {
          created_at: string
          emotions: string[]
          entry_date: string
          feeling: string | null
          id: string
          learning: string | null
          plan_id: string
          rp_c: number
          rp_d: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          emotions?: string[]
          entry_date: string
          feeling?: string | null
          id?: string
          learning?: string | null
          plan_id: string
          rp_c?: number
          rp_d?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          emotions?: string[]
          entry_date?: string
          feeling?: string | null
          id?: string
          learning?: string | null
          plan_id?: string
          rp_c?: number
          rp_d?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "closing_daily_logs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "closing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_plans: {
        Row: {
          created_at: string
          id: string
          pass_type: Database["public"]["Enums"]["pass_type"]
          started_at: string
          status: string
          targets: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pass_type: Database["public"]["Enums"]["pass_type"]
          started_at?: string
          status?: string
          targets?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pass_type?: Database["public"]["Enums"]["pass_type"]
          started_at?: string
          status?: string
          targets?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "closing_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_criteria: {
        Row: {
          created_at: string | null
          criteria_text: string
          display_order: number | null
          id: string
          is_active: boolean | null
          step_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          criteria_text: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          step_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          criteria_text?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          step_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_criteria_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "coach_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_debrief_options: {
        Row: {
          created_at: string | null
          debrief_label: string
          display_order: number | null
          id: string
          options: string[]
          step_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          debrief_label: string
          display_order?: number | null
          id?: string
          options: string[]
          step_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          debrief_label?: string
          display_order?: number | null
          id?: string
          options?: string[]
          step_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_debrief_options_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "coach_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_script_refs: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          script_content: string | null
          script_lines: string[]
          step_id: string
          sub_mode: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          script_content?: string | null
          script_lines: string[]
          step_id: string
          sub_mode?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          script_content?: string | null
          script_lines?: string[]
          step_id?: string
          sub_mode?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_script_refs_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "coach_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_steps: {
        Row: {
          coach_type_id: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          label: string
          objective: string | null
          step_id: string
          step_number: number
          tips: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          coach_type_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label: string
          objective?: string | null
          step_id: string
          step_number: number
          tips?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          coach_type_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
          objective?: string | null
          step_id?: string
          step_number?: number
          tips?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_steps_coach_type_id_fkey"
            columns: ["coach_type_id"]
            isOneToOne: false
            referencedRelation: "coach_types"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_type_assignments: {
        Row: {
          coach_id: string
          coach_type_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
        }
        Insert: {
          coach_id: string
          coach_type_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
        }
        Update: {
          coach_id?: string
          coach_type_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_type_assignments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_type_assignments_coach_type_id_fkey"
            columns: ["coach_type_id"]
            isOneToOne: false
            referencedRelation: "coach_types"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_types: {
        Row: {
          assigned_coach_id: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          label: string
          name: string
          sub_modes: string[] | null
          theme_bg: string | null
          theme_color: string
          updated_at: string | null
        }
        Insert: {
          assigned_coach_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label: string
          name: string
          sub_modes?: string[] | null
          theme_bg?: string | null
          theme_color: string
          updated_at?: string | null
        }
        Update: {
          assigned_coach_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
          name?: string
          sub_modes?: string[] | null
          theme_bg?: string | null
          theme_color?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_types_assigned_coach_id_fkey"
            columns: ["assigned_coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_attendance: {
        Row: {
          id: string
          joined_at: string
          occurrence_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          occurrence_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          occurrence_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_attendance_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "coaching_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_occurrences: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          occurrence_date: string
          replay_added_at: string | null
          replay_available_until: string | null
          replay_password: string | null
          replay_url: string | null
          slot_id: string
          started_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          occurrence_date: string
          replay_added_at?: string | null
          replay_available_until?: string | null
          replay_password?: string | null
          replay_url?: string | null
          slot_id: string
          started_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          occurrence_date?: string
          replay_added_at?: string | null
          replay_available_until?: string | null
          replay_password?: string | null
          replay_url?: string | null
          slot_id?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      coaching_replay_views: {
        Row: {
          id: string
          occurrence_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          occurrence_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          occurrence_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_replay_views_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "coaching_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_replay_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_scores: {
        Row: {
          created_at: string | null
          criteria_scores: number[]
          debrief_responses: string[] | null
          id: string
          notes: string | null
          session_id: string
          step_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          criteria_scores?: number[]
          debrief_responses?: string[] | null
          id?: string
          notes?: string | null
          session_id: string
          step_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          criteria_scores?: number[]
          debrief_responses?: string[] | null
          id?: string
          notes?: string | null
          session_id?: string
          step_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_scores_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "coach_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_sessions: {
        Row: {
          coach_type_id: string
          coach_user_id: string
          created_at: string | null
          global_score: number | null
          id: string
          session_date: string
          session_number: number
          status: string
          structure_snapshot: Json | null
          student_user_id: string
          sub_mode: string | null
          updated_at: string | null
        }
        Insert: {
          coach_type_id: string
          coach_user_id: string
          created_at?: string | null
          global_score?: number | null
          id?: string
          session_date: string
          session_number?: number
          status?: string
          structure_snapshot?: Json | null
          student_user_id: string
          sub_mode?: string | null
          updated_at?: string | null
        }
        Update: {
          coach_type_id?: string
          coach_user_id?: string
          created_at?: string | null
          global_score?: number | null
          id?: string
          session_date?: string
          session_number?: number
          status?: string
          structure_snapshot?: Json | null
          student_user_id?: string
          sub_mode?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_sessions_coach_type_id_fkey"
            columns: ["coach_type_id"]
            isOneToOne: false
            referencedRelation: "coach_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_student_user_id_fkey"
            columns: ["student_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
          payment_id: string | null
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
          payment_id?: string | null
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
          payment_id?: string | null
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
            foreignKeyName: "commissions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
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
          payment_code: string | null
          phone_normalized: string | null
          phone_original: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          payment_code?: string | null
          phone_normalized?: string | null
          phone_original?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          payment_code?: string | null
          phone_normalized?: string | null
          phone_original?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contacts_phone_backup_20260418: {
        Row: {
          backup_at: string | null
          id: string | null
          phone_normalized: string | null
          phone_original: string | null
        }
        Insert: {
          backup_at?: string | null
          id?: string | null
          phone_normalized?: string | null
          phone_original?: string | null
        }
        Update: {
          backup_at?: string | null
          id?: string | null
          phone_normalized?: string | null
          phone_original?: string | null
        }
        Relationships: []
      }
      content_pieces: {
        Row: {
          created_at: string | null
          current_step: number | null
          description: Json | null
          format: string
          id: string
          ideas: Json | null
          publication_checklist: Json | null
          published_at: string | null
          scheduled_for: string | null
          script: Json | null
          selected_idea: Json | null
          status: string
          theme: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_step?: number | null
          description?: Json | null
          format: string
          id?: string
          ideas?: Json | null
          publication_checklist?: Json | null
          published_at?: string | null
          scheduled_for?: string | null
          script?: Json | null
          selected_idea?: Json | null
          status?: string
          theme: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_step?: number | null
          description?: Json | null
          format?: string
          id?: string
          ideas?: Json | null
          publication_checklist?: Json | null
          published_at?: string | null
          scheduled_for?: string | null
          script?: Json | null
          selected_idea?: Json | null
          status?: string
          theme?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_pieces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_percent: number
          expires_at: string | null
          id: string
          max_redemptions: number | null
          stripe_coupon_id: string | null
          times_redeemed: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_percent: number
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          stripe_coupon_id?: string | null
          times_redeemed?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          stripe_coupon_id?: string | null
          times_redeemed?: number
          updated_at?: string
        }
        Relationships: []
      }
      fixed_charges: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      formation_certificates: {
        Row: {
          certificate_number: string
          created_at: string
          formation_id: string
          id: string
          issue_source: string
          issued_at: string
          issued_by: string | null
          pdf_storage_path: string | null
          revoked_at: string | null
          revoked_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_number: string
          created_at?: string
          formation_id: string
          id?: string
          issue_source: string
          issued_at?: string
          issued_by?: string | null
          pdf_storage_path?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_number?: string
          created_at?: string
          formation_id?: string
          id?: string
          issue_source?: string
          issued_at?: string
          issued_by?: string | null
          pdf_storage_path?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formation_certificates_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formation_certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formation_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      formation_chapitres: {
        Row: {
          created_at: string
          description: string | null
          duree_estimee_minutes: number | null
          id: string
          legacy_id: string | null
          module_id: string
          notes_formateur: string | null
          ordre: number
          status: string
          titre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duree_estimee_minutes?: number | null
          id?: string
          legacy_id?: string | null
          module_id: string
          notes_formateur?: string | null
          ordre?: number
          status?: string
          titre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duree_estimee_minutes?: number | null
          id?: string
          legacy_id?: string | null
          module_id?: string
          notes_formateur?: string | null
          ordre?: number
          status?: string
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formation_chapitres_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "formation_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      formation_enrollments: {
        Row: {
          formation_id: string
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
          revoked_at: string | null
          source: string
          user_id: string
        }
        Insert: {
          formation_id: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          revoked_at?: string | null
          source?: string
          user_id: string
        }
        Update: {
          formation_id?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          revoked_at?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formation_enrollments_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      formation_modules: {
        Row: {
          created_at: string
          description: string | null
          formation_id: string
          id: string
          legacy_id: string | null
          ordre: number
          status: string
          titre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          formation_id: string
          id?: string
          legacy_id?: string | null
          ordre?: number
          status?: string
          titre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          formation_id?: string
          id?: string
          legacy_id?: string | null
          ordre?: number
          status?: string
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formation_modules_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      formations: {
        Row: {
          couleur: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          legacy_id: string | null
          ordre: number
          slug: string
          status: string
          titre: string
          updated_at: string
        }
        Insert: {
          couleur?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          legacy_id?: string | null
          ordre?: number
          slug: string
          status?: string
          titre: string
          updated_at?: string
        }
        Update: {
          couleur?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          legacy_id?: string | null
          ordre?: number
          slug?: string
          status?: string
          titre?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitation_campaign_runs: {
        Row: {
          failed: number
          finished_at: string | null
          id: string
          processed: number
          sent: number
          started_at: string
          triggered_by: string
        }
        Insert: {
          failed?: number
          finished_at?: string | null
          id?: string
          processed?: number
          sent?: number
          started_at?: string
          triggered_by?: string
        }
        Update: {
          failed?: number
          finished_at?: string | null
          id?: string
          processed?: number
          sent?: number
          started_at?: string
          triggered_by?: string
        }
        Relationships: []
      }
      invitation_campaigns: {
        Row: {
          created_at: string
          error: string | null
          id: string
          planned_date: string
          planned_time: string
          sent_at: string | null
          user_id: string
          wave_number: number
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          planned_date: string
          planned_time?: string
          sent_at?: string | null
          user_id: string
          wave_number: number
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          planned_date?: string
          planned_time?: string
          sent_at?: string | null
          user_id?: string
          wave_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "invitation_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          client_name: string
          commission_amount: number
          commission_percentage: number
          created_at: string | null
          id: string
          invoice_id: string
          payment_amount: number
          payment_date: string
          payment_id: string | null
          sale_id: string | null
        }
        Insert: {
          client_name: string
          commission_amount: number
          commission_percentage: number
          created_at?: string | null
          id?: string
          invoice_id: string
          payment_amount: number
          payment_date: string
          payment_id?: string | null
          sale_id?: string | null
        }
        Update: {
          client_name?: string
          commission_amount?: number
          commission_percentage?: number
          created_at?: string | null
          id?: string
          invoice_id?: string
          payment_amount?: number
          payment_date?: string
          payment_id?: string | null
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "apporteur_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "lead_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_quiz_configs: {
        Row: {
          conference: Json
          created_at: string
          id: string
          intro: Json
          is_active: boolean
          landing: Json
          orientation_question: Json
          profiles: Json
          questions: Json
          updated_at: string
          version: number
          whatsapp_message: string
        }
        Insert: {
          conference?: Json
          created_at?: string
          id?: string
          intro?: Json
          is_active?: boolean
          landing?: Json
          orientation_question: Json
          profiles: Json
          questions: Json
          updated_at?: string
          version: number
          whatsapp_message?: string
        }
        Update: {
          conference?: Json
          created_at?: string
          id?: string
          intro?: Json
          is_active?: boolean
          landing?: Json
          orientation_question?: Json
          profiles?: Json
          questions?: Json
          updated_at?: string
          version?: number
          whatsapp_message?: string
        }
        Relationships: []
      }
      lead_quiz_owners: {
        Row: {
          created_at: string
          display_name: string
          display_role: string
          id: string
          is_active: boolean
          slug: string
          total_views: number
          updated_at: string
          user_id: string
          whatsapp_phone: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          display_role?: string
          id?: string
          is_active?: boolean
          slug: string
          total_views?: number
          updated_at?: string
          user_id: string
          whatsapp_phone?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          display_role?: string
          id?: string
          is_active?: boolean
          slug?: string
          total_views?: number
          updated_at?: string
          user_id?: string
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_quiz_owners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_quiz_submissions: {
        Row: {
          answers: Json
          config_version: number
          contact_id: string | null
          created_at: string
          email: string
          email_captured_at: string
          first_name: string
          id: string
          ip_country: string | null
          last_name: string
          last_question_reached: string | null
          last_seen_at: string
          lead_id: string | null
          orientation_choice: string | null
          owner_id: string
          phone: string | null
          phone_captured_at: string | null
          profile: string | null
          quiz_completed_at: string | null
          quiz_started_at: string | null
          referrer: string | null
          scores: Json | null
          status: string
          updated_at: string
          user_agent: string | null
          whatsapp_clicked_at: string | null
        }
        Insert: {
          answers?: Json
          config_version: number
          contact_id?: string | null
          created_at?: string
          email: string
          email_captured_at?: string
          first_name: string
          id?: string
          ip_country?: string | null
          last_name: string
          last_question_reached?: string | null
          last_seen_at?: string
          lead_id?: string | null
          orientation_choice?: string | null
          owner_id: string
          phone?: string | null
          phone_captured_at?: string | null
          profile?: string | null
          quiz_completed_at?: string | null
          quiz_started_at?: string | null
          referrer?: string | null
          scores?: Json | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          whatsapp_clicked_at?: string | null
        }
        Update: {
          answers?: Json
          config_version?: number
          contact_id?: string | null
          created_at?: string
          email?: string
          email_captured_at?: string
          first_name?: string
          id?: string
          ip_country?: string | null
          last_name?: string
          last_question_reached?: string | null
          last_seen_at?: string
          lead_id?: string | null
          orientation_choice?: string | null
          owner_id?: string
          phone?: string | null
          phone_captured_at?: string | null
          profile?: string | null
          quiz_completed_at?: string | null
          quiz_started_at?: string | null
          referrer?: string | null
          scores?: Json | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          whatsapp_clicked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_quiz_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_quiz_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_quiz_submissions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "lead_quiz_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          tag_category: string
          tag_key: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          tag_category: string
          tag_key: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          tag_category?: string
          tag_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          apporteur_id: string | null
          apporteur_source: string | null
          apporteur_source_detail: string | null
          assigned_at: string | null
          assigned_to: string | null
          call_type: string | null
          conference_date: string | null
          contact_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          raw_email: string | null
          raw_full_name: string | null
          raw_phone: string | null
          recycled_at: string | null
          source: string
          source_detail: string | null
          status: string
          systeme_io_id: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          apporteur_id?: string | null
          apporteur_source?: string | null
          apporteur_source_detail?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          call_type?: string | null
          conference_date?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          raw_email?: string | null
          raw_full_name?: string | null
          raw_phone?: string | null
          recycled_at?: string | null
          source: string
          source_detail?: string | null
          status?: string
          systeme_io_id?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          apporteur_id?: string | null
          apporteur_source?: string | null
          apporteur_source_detail?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          call_type?: string | null
          conference_date?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          raw_email?: string | null
          raw_full_name?: string | null
          raw_phone?: string | null
          recycled_at?: string | null
          source?: string
          source_detail?: string | null
          status?: string
          systeme_io_id?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
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
      leads_phone_backup_20260418: {
        Row: {
          backup_at: string | null
          id: string | null
          raw_phone: string | null
        }
        Insert: {
          backup_at?: string | null
          id?: string | null
          raw_phone?: string | null
        }
        Update: {
          backup_at?: string | null
          id?: string | null
          raw_phone?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          metadata: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      objection_categories: {
        Row: {
          created_at: string | null
          icon: string
          id: string
          label: string
          ordre: number
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          icon?: string
          id?: string
          label: string
          ordre?: number
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          icon?: string
          id?: string
          label?: string
          ordre?: number
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      objections: {
        Row: {
          category_id: string
          created_at: string | null
          etapes: Json | null
          id: string
          ordre: number
          reponse: string
          situation: string
          updated_at: string | null
          verbatim: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          etapes?: Json | null
          id?: string
          ordre?: number
          reponse: string
          situation: string
          updated_at?: string | null
          verbatim?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          etapes?: Json | null
          id?: string
          ordre?: number
          reponse?: string
          situation?: string
          updated_at?: string | null
          verbatim?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objections_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "objection_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      parcours: {
        Row: {
          created_at: string
          id: string
          ordre: number
          pass_type: Database["public"]["Enums"]["pass_type"]
          slug: string
          status: string
          subtitle: string | null
          titre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordre?: number
          pass_type: Database["public"]["Enums"]["pass_type"]
          slug: string
          status?: string
          subtitle?: string | null
          titre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ordre?: number
          pass_type?: Database["public"]["Enums"]["pass_type"]
          slug?: string
          status?: string
          subtitle?: string | null
          titre?: string
          updated_at?: string
        }
        Relationships: []
      }
      parcours_chapitre_progress: {
        Row: {
          chapitre_id: string
          completed_at: string
          user_id: string
        }
        Insert: {
          chapitre_id: string
          completed_at?: string
          user_id: string
        }
        Update: {
          chapitre_id?: string
          completed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcours_chapitre_progress_chapitre_id_fkey"
            columns: ["chapitre_id"]
            isOneToOne: false
            referencedRelation: "parcours_chapitres"
            referencedColumns: ["id"]
          },
        ]
      }
      parcours_chapitre_ressources: {
        Row: {
          chapitre_id: string
          created_at: string
          id: string
          ordre: number
          titre: string
          type: string
          url: string
          video_id: string | null
        }
        Insert: {
          chapitre_id: string
          created_at?: string
          id?: string
          ordre?: number
          titre: string
          type: string
          url: string
          video_id?: string | null
        }
        Update: {
          chapitre_id?: string
          created_at?: string
          id?: string
          ordre?: number
          titre?: string
          type?: string
          url?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parcours_chapitre_ressources_chapitre_id_fkey"
            columns: ["chapitre_id"]
            isOneToOne: false
            referencedRelation: "parcours_chapitres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcours_chapitre_ressources_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "parcours_chapitre_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      parcours_chapitre_videos: {
        Row: {
          chapitre_id: string
          created_at: string
          duree_secondes: number | null
          id: string
          notes: string | null
          ordre: number
          titre: string
          updated_at: string
          url: string | null
          vimeo_id: string | null
        }
        Insert: {
          chapitre_id: string
          created_at?: string
          duree_secondes?: number | null
          id?: string
          notes?: string | null
          ordre?: number
          titre?: string
          updated_at?: string
          url?: string | null
          vimeo_id?: string | null
        }
        Update: {
          chapitre_id?: string
          created_at?: string
          duree_secondes?: number | null
          id?: string
          notes?: string | null
          ordre?: number
          titre?: string
          updated_at?: string
          url?: string | null
          vimeo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parcours_chapitre_videos_chapitre_id_fkey"
            columns: ["chapitre_id"]
            isOneToOne: false
            referencedRelation: "parcours_chapitres"
            referencedColumns: ["id"]
          },
        ]
      }
      parcours_chapitres: {
        Row: {
          created_at: string
          description: string | null
          duree_estimee_minutes: number | null
          formation_id: string | null
          id: string
          milestone_emoji: string | null
          milestone_message: string | null
          numero: number
          ordre: number
          phase_id: string
          status: string
          titre: string
          type: string
          video_url: string | null
          vimeo_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duree_estimee_minutes?: number | null
          formation_id?: string | null
          id?: string
          milestone_emoji?: string | null
          milestone_message?: string | null
          numero: number
          ordre: number
          phase_id: string
          status?: string
          titre: string
          type: string
          video_url?: string | null
          vimeo_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duree_estimee_minutes?: number | null
          formation_id?: string | null
          id?: string
          milestone_emoji?: string | null
          milestone_message?: string | null
          numero?: number
          ordre?: number
          phase_id?: string
          status?: string
          titre?: string
          type?: string
          video_url?: string | null
          vimeo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parcours_chapitres_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcours_chapitres_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "parcours_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      parcours_enrollments: {
        Row: {
          completed_at: string | null
          granted_at: string
          parcours_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          granted_at?: string
          parcours_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          granted_at?: string
          parcours_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcours_enrollments_parcours_id_fkey"
            columns: ["parcours_id"]
            isOneToOne: false
            referencedRelation: "parcours"
            referencedColumns: ["id"]
          },
        ]
      }
      parcours_phases: {
        Row: {
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          numero: number
          ordre: number
          parcours_id: string
          status: string
          titre: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          numero: number
          ordre: number
          parcours_id: string
          status?: string
          titre: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          numero?: number
          ordre?: number
          parcours_id?: string
          status?: string
          titre?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcours_phases_parcours_id_fkey"
            columns: ["parcours_id"]
            isOneToOne: false
            referencedRelation: "parcours"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          payment_id: string | null
          sale_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          payment_id?: string | null
          sale_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          payment_id?: string | null
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_audit_log_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_audit_log_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          contact_id: string | null
          created_at: string | null
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_number: number
          sale_id: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          total_payments: number
          updated_at: string | null
        }
        Insert: {
          amount: number
          contact_id?: string | null
          created_at?: string | null
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_number: number
          sale_id?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          total_payments: number
          updated_at?: string | null
        }
        Update: {
          amount?: number
          contact_id?: string | null
          created_at?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_number?: number
          sale_id?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          total_payments?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_opened_at: string | null
          access_sent_count: number
          address: string | null
          avatar_url: string | null
          bank_country: string | null
          bank_details: Json | null
          bank_rib_url: string | null
          calendly_email: string | null
          can_add_instagram_leads: boolean | null
          can_assign_leads: boolean
          city: string | null
          collaborateur_level: string | null
          country: string | null
          created_at: string | null
          discord_joined_at: string | null
          early_access: boolean
          email: string
          fixed_salary: number | null
          fixed_salary_active: boolean
          full_name: string
          id: string
          is_active: boolean
          is_also_apporteur: boolean | null
          is_coach: boolean | null
          last_access_sent_at: string | null
          onboarding_completed: boolean
          origin: string
          phone: string | null
          postal_code: string | null
          role: string
          siret: string | null
          timezone: string | null
          updated_at: string | null
          welcome_video_completed_at: string | null
        }
        Insert: {
          access_opened_at?: string | null
          access_sent_count?: number
          address?: string | null
          avatar_url?: string | null
          bank_country?: string | null
          bank_details?: Json | null
          bank_rib_url?: string | null
          calendly_email?: string | null
          can_add_instagram_leads?: boolean | null
          can_assign_leads?: boolean
          city?: string | null
          collaborateur_level?: string | null
          country?: string | null
          created_at?: string | null
          discord_joined_at?: string | null
          early_access?: boolean
          email: string
          fixed_salary?: number | null
          fixed_salary_active?: boolean
          full_name: string
          id: string
          is_active?: boolean
          is_also_apporteur?: boolean | null
          is_coach?: boolean | null
          last_access_sent_at?: string | null
          onboarding_completed?: boolean
          origin?: string
          phone?: string | null
          postal_code?: string | null
          role?: string
          siret?: string | null
          timezone?: string | null
          updated_at?: string | null
          welcome_video_completed_at?: string | null
        }
        Update: {
          access_opened_at?: string | null
          access_sent_count?: number
          address?: string | null
          avatar_url?: string | null
          bank_country?: string | null
          bank_details?: Json | null
          bank_rib_url?: string | null
          calendly_email?: string | null
          can_add_instagram_leads?: boolean | null
          can_assign_leads?: boolean
          city?: string | null
          collaborateur_level?: string | null
          country?: string | null
          created_at?: string | null
          discord_joined_at?: string | null
          early_access?: boolean
          email?: string
          fixed_salary?: number | null
          fixed_salary_active?: boolean
          full_name?: string
          id?: string
          is_active?: boolean
          is_also_apporteur?: boolean | null
          is_coach?: boolean | null
          last_access_sent_at?: string | null
          onboarding_completed?: boolean
          origin?: string
          phone?: string | null
          postal_code?: string | null
          role?: string
          siret?: string | null
          timezone?: string | null
          updated_at?: string | null
          welcome_video_completed_at?: string | null
        }
        Relationships: []
      }
      prospect_profiles: {
        Row: {
          created_at: string | null
          description: string | null
          emoji: string
          id: string
          label: string
          niveau: string
          ordre: number
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          emoji?: string
          id?: string
          label: string
          niveau?: string
          ordre?: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          emoji?: string
          id?: string
          label?: string
          niveau?: string
          ordre?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      prospect_scripts: {
        Row: {
          created_at: string | null
          id: string
          intro: string | null
          profile_id: string
          repliques: Json
          titre: string
          type_appel: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          intro?: string | null
          profile_id: string
          repliques?: Json
          titre: string
          type_appel: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          intro?: string | null
          profile_id?: string
          repliques?: Json
          titre?: string
          type_appel?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_scripts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "prospect_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          completed_at: string | null
          errors_count: number
          id: string
          quiz_id: string
          total_questions: number
          user_id: string
          validated: boolean
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          errors_count?: number
          id?: string
          quiz_id: string
          total_questions?: number
          user_id: string
          validated?: boolean
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          errors_count?: number
          id?: string
          quiz_id?: string
          total_questions?: number
          user_id?: string
          validated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          contexte: string | null
          correct_index: number
          created_at: string | null
          explication: string | null
          id: string
          options: Json
          ordre: number
          question: string
          quiz_id: string
          updated_at: string | null
        }
        Insert: {
          contexte?: string | null
          correct_index?: number
          created_at?: string | null
          explication?: string | null
          id?: string
          options?: Json
          ordre?: number
          question: string
          quiz_id: string
          updated_at?: string | null
        }
        Update: {
          contexte?: string | null
          correct_index?: number
          created_at?: string | null
          explication?: string | null
          id?: string
          options?: Json
          ordre?: number
          question?: string
          quiz_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions_backup_20260417: {
        Row: {
          backup_at: string | null
          contexte: string | null
          correct_index: number | null
          created_at: string | null
          explication: string | null
          id: string | null
          options: Json | null
          ordre: number | null
          question: string | null
          quiz_id: string | null
          quiz_titre: string | null
          updated_at: string | null
        }
        Insert: {
          backup_at?: string | null
          contexte?: string | null
          correct_index?: number | null
          created_at?: string | null
          explication?: string | null
          id?: string | null
          options?: Json | null
          ordre?: number | null
          question?: string | null
          quiz_id?: string | null
          quiz_titre?: string | null
          updated_at?: string | null
        }
        Update: {
          backup_at?: string | null
          contexte?: string | null
          correct_index?: number | null
          created_at?: string | null
          explication?: string | null
          id?: string | null
          options?: Json | null
          ordre?: number | null
          question?: string | null
          quiz_id?: string | null
          quiz_titre?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          chapitre_id: string | null
          created_at: string | null
          description: string | null
          formation_id: string | null
          id: string
          max_errors: number
          module_id: string | null
          status: string
          titre: string
          updated_at: string | null
        }
        Insert: {
          chapitre_id?: string | null
          created_at?: string | null
          description?: string | null
          formation_id?: string | null
          id?: string
          max_errors?: number
          module_id?: string | null
          status?: string
          titre: string
          updated_at?: string | null
        }
        Update: {
          chapitre_id?: string | null
          created_at?: string | null
          description?: string | null
          formation_id?: string | null
          id?: string
          max_errors?: number
          module_id?: string | null
          status?: string
          titre?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_chapitre_id_fkey"
            columns: ["chapitre_id"]
            isOneToOne: false
            referencedRelation: "formation_chapitres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "formation_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_periods: {
        Row: {
          amount: number
          created_at: string | null
          end_date: string | null
          id: string
          profile_id: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          profile_id: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          profile_id?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_periods_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_ht: number
          buyer_profile_id: string | null
          call_id: string | null
          closed_by: string | null
          conference_date: string | null
          contact_id: string
          coupon_code: string | null
          created_at: string | null
          discount_amount: number | null
          id: string
          lead_id: string | null
          mensualites: number | null
          parent_sale_id: string | null
          payment_status: string | null
          product: string
          rebill_token: string | null
          sale_type: string | null
          sold_at: string | null
          stripe_session_id: string | null
          systeme_io_order_id: string | null
        }
        Insert: {
          amount_ht: number
          buyer_profile_id?: string | null
          call_id?: string | null
          closed_by?: string | null
          conference_date?: string | null
          contact_id: string
          coupon_code?: string | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          lead_id?: string | null
          mensualites?: number | null
          parent_sale_id?: string | null
          payment_status?: string | null
          product: string
          rebill_token?: string | null
          sale_type?: string | null
          sold_at?: string | null
          stripe_session_id?: string | null
          systeme_io_order_id?: string | null
        }
        Update: {
          amount_ht?: number
          buyer_profile_id?: string | null
          call_id?: string | null
          closed_by?: string | null
          conference_date?: string | null
          contact_id?: string
          coupon_code?: string | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          lead_id?: string | null
          mensualites?: number | null
          parent_sale_id?: string | null
          payment_status?: string | null
          product?: string
          rebill_token?: string | null
          sale_type?: string | null
          sold_at?: string | null
          stripe_session_id?: string | null
          systeme_io_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_buyer_profile_id_fkey"
            columns: ["buyer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "sales_parent_sale_id_fkey"
            columns: ["parent_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      script_extras: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          key: string
          label: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          id?: string
          key: string
          label: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          key?: string
          label?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      script_phases: {
        Row: {
          cases: Json | null
          cases2: Json | null
          created_at: string | null
          id: string
          label: string
          lines: Json
          lines2: Json | null
          ordre: number
          script_id: string
          updated_at: string | null
          voix: string
        }
        Insert: {
          cases?: Json | null
          cases2?: Json | null
          created_at?: string | null
          id?: string
          label: string
          lines?: Json
          lines2?: Json | null
          ordre?: number
          script_id: string
          updated_at?: string | null
          voix?: string
        }
        Update: {
          cases?: Json | null
          cases2?: Json | null
          created_at?: string | null
          id?: string
          label?: string
          lines?: Json
          lines2?: Json | null
          ordre?: number
          script_id?: string
          updated_at?: string | null
          voix?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_phases_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          cat: string
          couleur: string
          created_at: string | null
          description: string
          icon: string
          id: string
          nom: string
          ordre: number
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          cat: string
          couleur?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          nom: string
          ordre?: number
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          cat?: string
          couleur?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          nom?: string
          ordre?: number
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_feature_unlocks: {
        Row: {
          feature: string
          unlocked_at: string
          unlocked_by: string | null
          user_id: string
        }
        Insert: {
          feature: string
          unlocked_at?: string
          unlocked_by?: string | null
          user_id: string
        }
        Update: {
          feature?: string
          unlocked_at?: string
          unlocked_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_organisation_plans: {
        Row: {
          created_at: string
          id: string
          pack: Database["public"]["Enums"]["pass_type"]
          plan: Json
          selected_recurrence_ids: string[]
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          pack: Database["public"]["Enums"]["pass_type"]
          plan: Json
          selected_recurrence_ids?: string[]
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          pack?: Database["public"]["Enums"]["pass_type"]
          plan?: Json
          selected_recurrence_ids?: string[]
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      user_organisation_profile: {
        Row: {
          answers: Json
          committed_at: string | null
          pack: Database["public"]["Enums"]["pass_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          committed_at?: string | null
          pack: Database["public"]["Enums"]["pass_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          committed_at?: string | null
          pack?: Database["public"]["Enums"]["pass_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_passes: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
          pass_type: Database["public"]["Enums"]["pass_type"]
          revoked_at: string | null
          revoked_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          pass_type: Database["public"]["Enums"]["pass_type"]
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          pass_type?: Database["public"]["Enums"]["pass_type"]
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_passes_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_passes_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_passes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_personal_brand: {
        Row: {
          answers: Json
          created_at: string
          generated_profiles: Json | null
          profiles_generated_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          generated_profiles?: Json | null
          profiles_generated_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          generated_profiles?: Json | null
          profiles_generated_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_progress: {
        Row: {
          completed: boolean
          id: string
          last_watched_at: string
          user_id: string
          video_id: string
          watched_seconds: number
        }
        Insert: {
          completed?: boolean
          id?: string
          last_watched_at?: string
          user_id: string
          video_id: string
          watched_seconds?: number
        }
        Update: {
          completed?: boolean
          id?: string
          last_watched_at?: string
          user_id?: string
          video_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "chapitre_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_failures: {
        Row: {
          created_call_id: string | null
          error_message: string | null
          error_stack: string | null
          headers: Json | null
          id: string
          notes: string | null
          payload: Json
          received_at: string
          replay_error: string | null
          replay_status: string | null
          replayed_at: string | null
          replayed_by: string | null
          resolved_at: string | null
          source: string
          status_code: number | null
        }
        Insert: {
          created_call_id?: string | null
          error_message?: string | null
          error_stack?: string | null
          headers?: Json | null
          id?: string
          notes?: string | null
          payload: Json
          received_at?: string
          replay_error?: string | null
          replay_status?: string | null
          replayed_at?: string | null
          replayed_by?: string | null
          resolved_at?: string | null
          source: string
          status_code?: number | null
        }
        Update: {
          created_call_id?: string | null
          error_message?: string | null
          error_stack?: string | null
          headers?: Json | null
          id?: string
          notes?: string | null
          payload?: Json
          received_at?: string
          replay_error?: string | null
          replay_status?: string | null
          replayed_at?: string | null
          replayed_by?: string | null
          resolved_at?: string | null
          source?: string
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_failures_replayed_by_fkey"
            columns: ["replayed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_systeme_io_payloads: {
        Row: {
          contact_id: string | null
          id: number
          lead_id: string | null
          parse_notes: string | null
          payload: Json
          received_at: string
          source: string | null
          source_url: string | null
          systeme_io_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          contact_id?: string | null
          id?: number
          lead_id?: string | null
          parse_notes?: string | null
          payload: Json
          received_at?: string
          source?: string | null
          source_url?: string | null
          systeme_io_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          contact_id?: string | null
          id?: number
          lead_id?: string | null
          parse_notes?: string | null
          payload?: Json
          received_at?: string
          source?: string | null
          source_url?: string | null
          systeme_io_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      activity_weekly_totals: {
        Row: {
          appointments: number | null
          days_filled: number | null
          messages_sent: number | null
          replies_received: number | null
          sales_made: number | null
          user_id: string | null
          videos_published: number | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_daily_kpis_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calls_enriched: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          calendly_event_id: string | null
          canceled_at: string | null
          canceled_by: string | null
          canceled_by_name: string | null
          cancellation_reason: string | null
          closer_notes: string | null
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
          raw_email: string | null
          raw_full_name: string | null
          raw_phone: string | null
          rescheduled_from: string | null
          scheduled_at: string | null
          status: string | null
          status_label: string | null
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
      public_certificates_view: {
        Row: {
          certificate_number: string | null
          formation_titre: string | null
          is_revoked: boolean | null
          issued_at: string | null
          revoked_at: string | null
          user_full_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_payment_admin: {
        Args: { p_amount: number; p_due_date: string; p_sale_id: string }
        Returns: {
          amount: number
          contact_id: string | null
          created_at: string | null
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_number: number
          sale_id: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          total_payments: number
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_cleanup_user: { Args: { p_user_id: string }; Returns: undefined }
      apporteur_update_lead_source: {
        Args: {
          p_lead_id: string
          p_note?: string
          p_source: string
          p_source_detail?: string
        }
        Returns: Json
      }
      apporteur_update_lead_status: {
        Args: { p_lead_id: string; p_new_status: string; p_note?: string }
        Returns: Json
      }
      calculate_session_global_score: {
        Args: { p_session_id: string }
        Returns: number
      }
      can_assign_leads_now: { Args: never; Returns: boolean }
      compute_sale_payment_status: {
        Args: { p_sale_id: string }
        Returns: string
      }
      create_client_invoice: {
        Args: { p_payment_id: string }
        Returns: {
          amount: number
          client_address: string
          client_city: string
          client_country: string
          client_email: string
          client_name: string
          client_postal_code: string
          contact_id: string
          id: string
          invoice_number: string
          paid_at: string
          payment_id: string
          payment_number: number
          product: string
          sale_id: string
          total_payments: number
        }[]
      }
      delete_payment_admin: {
        Args: { p_payment_id: string }
        Returns: undefined
      }
      delete_sale_admin: { Args: { p_sale_id: string }; Returns: undefined }
      duplicate_formation: { Args: { p_formation_id: string }; Returns: string }
      enqueue_activity_reminders: { Args: never; Returns: number }
      ensure_coaching_occurrence: {
        Args: {
          p_duration_minutes?: number
          p_occurrence_date: string
          p_slot_id: string
          p_started_at: string
        }
        Returns: string
      }
      ensure_quiz_owner_for_current_user: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          display_role: string
          id: string
          is_active: boolean
          slug: string
          total_views: number
          updated_at: string
          user_id: string
          whatsapp_phone: string | null
        }
        SetofOptions: {
          from: "*"
          to: "lead_quiz_owners"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      find_or_create_contact: {
        Args: { p_email: string; p_full_name?: string; p_phone: string }
        Returns: string
      }
      generate_payment_code: { Args: { p_contact_id: string }; Returns: string }
      generate_quiz_owner_slug: {
        Args: { p_full_name: string }
        Returns: string
      }
      generate_rebill_token: { Args: { p_sale_id: string }; Returns: string }
      get_chapter_navigation: {
        Args: { p_chapitre_id: string }
        Returns: {
          current_formation_id: string
          current_formation_slug: string
          next_chapitre_id: string
          next_chapitre_titre: string
          next_module_id: string
          prev_chapitre_id: string
          prev_chapitre_titre: string
          prev_module_id: string
        }[]
      }
      get_formation_progress: {
        Args: { p_formation_id: string; p_user_id: string }
        Returns: number
      }
      get_locked_chapitres: {
        Args: { p_formation_id: string; p_user_id: string }
        Returns: {
          blocker_chapitre_id: string
          blocker_quiz_id: string
          blocker_quiz_titre: string
          chapitre_id: string
        }[]
      }
      get_missing_formation_quizzes: {
        Args: { p_formation_id: string; p_user_id: string }
        Returns: {
          chapitre_id: string
          chapitre_ordre: number
          chapitre_titre: string
          module_id: string
          module_ordre: number
          module_titre: string
          quiz_id: string
          quiz_titre: string
          quiz_type: string
        }[]
      }
      get_user_access_timeline: {
        Args: { p_user_id: string }
        Returns: {
          details: Json
          event_at: string
          event_type: string
          performed_by_name: string
          subtitle: string
          title: string
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      has_formation_enrollment: {
        Args: { p_formation_id: string; p_user_id: string }
        Returns: boolean
      }
      import_quiz_from_json: { Args: { p_payload: Json }; Returns: string }
      is_ceo: { Args: { p_user_id: string }; Returns: boolean }
      is_quiz_slug_available: { Args: { p_slug: string }; Returns: boolean }
      lookup_payment_code: {
        Args: { p_code: string }
        Returns: {
          acompte_count: number
          acompte_first_at: string
          acompte_total: number
          contact_id: string
          email: string
          full_name: string
          phone: string
        }[]
      }
      lookup_rebill_token: {
        Args: { p_token: string }
        Returns: {
          contact_id: string
          email: string
          full_name: string
          installments_count: number
          is_valid: boolean
          monthly_amount: number
          payable_total: number
          phone: string
          product: string
          reason: string
          sale_id: string
        }[]
      }
      manual_recycle_leads: {
        Args: { p_lead_ids: string[]; p_reason?: string }
        Returns: Json
      }
      move_chapitre: {
        Args: {
          p_chapitre_id: string
          p_target_module_id: string
          p_target_ordre: number
        }
        Returns: undefined
      }
      next_client_invoice_number: {
        Args: { p_month: number; p_year: number }
        Returns: string
      }
      next_organisation_plan_version: {
        Args: { p_user_id: string }
        Returns: number
      }
      next_sunday_noon_paris_after: { Args: { p_ts: string }; Returns: string }
      nextval_certificate_seq: { Args: never; Returns: number }
      normalize_phone: { Args: { p_raw: string }; Returns: string }
      normalize_phone_e164: { Args: { phone: string }; Returns: string }
      parcours_next_chapitre: {
        Args: { p_parcours_id: string; p_user_id: string }
        Returns: string
      }
      prev_or_current_sunday_noon_paris: {
        Args: { p_ts: string }
        Returns: string
      }
      rebalance_commission_group: {
        Args: {
          p_beneficiary_external: string
          p_beneficiary_user_id: string
          p_role: string
          p_sale_id: string
        }
        Returns: undefined
      }
      recalculate_remaining_payments: {
        Args: { p_new_remaining_count: number; p_sale_id: string }
        Returns: undefined
      }
      record_discord_join: { Args: never; Returns: string }
      recycle_lead_by_setter: {
        Args: { p_lead_id: string; p_new_status: string; p_reason: string }
        Returns: undefined
      }
      reorder_chapitres: { Args: { p_updates: Json }; Returns: undefined }
      reorder_formations: {
        Args: { p_formation_ids: string[] }
        Returns: undefined
      }
      reorder_modules: {
        Args: { p_formation_id: string; p_module_ids: string[] }
        Returns: undefined
      }
      reorder_objection_categories: {
        Args: { p_category_ids: string[] }
        Returns: undefined
      }
      reorder_objections: {
        Args: { p_category_id: string; p_objection_ids: string[] }
        Returns: undefined
      }
      reorder_prospect_profiles: {
        Args: { p_profile_ids: string[] }
        Returns: undefined
      }
      reorder_quiz_questions: {
        Args: { p_question_ids: string[]; p_quiz_id: string }
        Returns: undefined
      }
      reorder_script_phases: {
        Args: { p_phase_ids: string[]; p_script_id: string }
        Returns: undefined
      }
      reorder_scripts: { Args: { p_script_ids: string[] }; Returns: undefined }
      set_chapter_completion: {
        Args: { p_chapitre_id: string; p_completed: boolean }
        Returns: boolean
      }
      set_client_invoice_pdf_path: {
        Args: { p_invoice_id: string; p_pdf_path: string }
        Returns: undefined
      }
      shuffle_quiz_options: {
        Args: { p_correct_index: number; p_options: Json }
        Returns: {
          new_correct_index: number
          shuffled_options: Json
        }[]
      }
      unlock_formation_from_parcours: {
        Args: { p_formation_id: string }
        Returns: string
      }
      update_payment_admin: {
        Args: {
          p_amount?: number
          p_due_date?: string
          p_notes?: string
          p_payment_id: string
        }
        Returns: {
          amount: number
          contact_id: string | null
          created_at: string | null
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_number: number
          sale_id: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          total_payments: number
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_active_pass_level: { Args: { p_user_id: string }; Returns: string }
      validate_coupon: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      group_session_status: "scheduled" | "live" | "completed" | "cancelled"
      meeting_provider: "zoom" | "meet" | "teams" | "other"
      pass_type: "al_baraka" | "liberty"
      recurrence_frequency: "none" | "weekly" | "biweekly" | "monthly"
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
      group_session_status: ["scheduled", "live", "completed", "cancelled"],
      meeting_provider: ["zoom", "meet", "teams", "other"],
      pass_type: ["al_baraka", "liberty"],
      recurrence_frequency: ["none", "weekly", "biweekly", "monthly"],
    },
  },
} as const
