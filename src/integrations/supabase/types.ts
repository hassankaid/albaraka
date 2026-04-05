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
      activity_kpis: {
        Row: {
          ai_feedback: string | null
          appointments: number
          created_at: string
          id: string
          messages_sent: number
          replies_received: number
          sales_made: number
          updated_at: string
          user_id: string
          videos_published: number
          week_start: string
        }
        Insert: {
          ai_feedback?: string | null
          appointments?: number
          created_at?: string
          id?: string
          messages_sent?: number
          replies_received?: number
          sales_made?: number
          updated_at?: string
          user_id: string
          videos_published?: number
          week_start: string
        }
        Update: {
          ai_feedback?: string | null
          appointments?: number
          created_at?: string
          id?: string
          messages_sent?: number
          replies_received?: number
          sales_made?: number
          updated_at?: string
          user_id?: string
          videos_published?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_kpis_user_id_fkey"
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
          id: string
          kpi_key: string
          updated_at: string
          weekly_target: number
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_key: string
          updated_at?: string
          weekly_target?: number
        }
        Update: {
          created_at?: string
          id?: string
          kpi_key?: string
          updated_at?: string
          weekly_target?: number
        }
        Relationships: []
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
          context_type: string
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_type?: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_type?: string
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
            foreignKeyName: "call_activities_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "leads_enriched"
            referencedColumns: ["contact_call_id"]
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
        }
        Insert: {
          chapitre_id: string
          created_at?: string
          id?: string
          ordre?: number
          titre: string
          type: string
          url: string
        }
        Update: {
          chapitre_id?: string
          created_at?: string
          id?: string
          ordre?: number
          titre?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapitre_ressources_chapitre_id_fkey"
            columns: ["chapitre_id"]
            isOneToOne: false
            referencedRelation: "formation_chapitres"
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
      content_pieces: {
        Row: {
          created_at: string | null
          current_step: number | null
          description: Json | null
          format: string
          id: string
          ideas: Json | null
          montage_checklist: Json | null
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
          montage_checklist?: Json | null
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
          montage_checklist?: Json | null
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
      formation_chapitres: {
        Row: {
          created_at: string
          description: string | null
          duree_estimee_minutes: number | null
          id: string
          legacy_id: string | null
          module_id: string
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
          apporteur_source: string | null
          apporteur_source_detail: string | null
          assigned_at: string | null
          assigned_to: string | null
          call_type: string | null
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
          address: string | null
          avatar_url: string | null
          bank_country: string | null
          bank_details: Json | null
          bank_rib_url: string | null
          calendly_email: string | null
          can_add_instagram_leads: boolean | null
          city: string | null
          collaborateur_level: string | null
          country: string | null
          created_at: string | null
          email: string
          fixed_salary: number | null
          fixed_salary_active: boolean
          full_name: string
          id: string
          is_active: boolean
          is_also_apporteur: boolean | null
          is_coach: boolean | null
          onboarding_completed: boolean
          phone: string | null
          postal_code: string | null
          role: string
          siret: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bank_country?: string | null
          bank_details?: Json | null
          bank_rib_url?: string | null
          calendly_email?: string | null
          can_add_instagram_leads?: boolean | null
          city?: string | null
          collaborateur_level?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          fixed_salary?: number | null
          fixed_salary_active?: boolean
          full_name: string
          id: string
          is_active?: boolean
          is_also_apporteur?: boolean | null
          is_coach?: boolean | null
          onboarding_completed?: boolean
          phone?: string | null
          postal_code?: string | null
          role?: string
          siret?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bank_country?: string | null
          bank_details?: Json | null
          bank_rib_url?: string | null
          calendly_email?: string | null
          can_add_instagram_leads?: boolean | null
          city?: string | null
          collaborateur_level?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          fixed_salary?: number | null
          fixed_salary_active?: boolean
          full_name?: string
          id?: string
          is_active?: boolean
          is_also_apporteur?: boolean | null
          is_coach?: boolean | null
          onboarding_completed?: boolean
          phone?: string | null
          postal_code?: string | null
          role?: string
          siret?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
          call_id: string | null
          closed_by: string | null
          contact_id: string
          created_at: string | null
          id: string
          lead_id: string | null
          mensualites: number | null
          parent_sale_id: string | null
          payment_status: string | null
          product: string
          sale_type: string | null
          sold_at: string | null
          systeme_io_order_id: string | null
        }
        Insert: {
          amount_ht: number
          call_id?: string | null
          closed_by?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          lead_id?: string | null
          mensualites?: number | null
          parent_sale_id?: string | null
          payment_status?: string | null
          product: string
          sale_type?: string | null
          sold_at?: string | null
          systeme_io_order_id?: string | null
        }
        Update: {
          amount_ht?: number
          call_id?: string | null
          closed_by?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          lead_id?: string | null
          mensualites?: number | null
          parent_sale_id?: string | null
          payment_status?: string | null
          product?: string
          sale_type?: string | null
          sold_at?: string | null
          systeme_io_order_id?: string | null
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
          {
            foreignKeyName: "sales_parent_sale_id_fkey"
            columns: ["parent_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
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
          call_type: string | null
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
      calculate_session_global_score: {
        Args: { p_session_id: string }
        Returns: number
      }
      compute_sale_payment_status: {
        Args: { p_sale_id: string }
        Returns: string
      }
      find_or_create_contact: {
        Args: { p_email: string; p_full_name?: string; p_phone: string }
        Returns: string
      }
      get_formation_progress: {
        Args: { p_formation_id: string; p_user_id: string }
        Returns: number
      }
      get_user_role: { Args: never; Returns: string }
      has_formation_enrollment: {
        Args: { p_formation_id: string; p_user_id: string }
        Returns: boolean
      }
      is_ceo: { Args: { p_user_id: string }; Returns: boolean }
      normalize_phone_e164: { Args: { phone: string }; Returns: string }
      rebalance_commission_group: {
        Args: {
          p_beneficiary_external: string
          p_beneficiary_user_id: string
          p_role: string
          p_sale_id: string
        }
        Returns: undefined
      }
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
