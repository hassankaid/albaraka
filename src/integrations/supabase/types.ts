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
      ab_conversions: {
        Row: {
          action: string
          created_at: string
          id: string
          test_id: string
          variant: string
          visitor_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          test_id: string
          variant: string
          visitor_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          test_id?: string
          variant?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_conversions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_exposures: {
        Row: {
          created_at: string
          id: string
          src: string | null
          test_id: string
          tunnel: string
          variant: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          src?: string | null
          test_id: string
          tunnel: string
          variant: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          src?: string | null
          test_id?: string
          tunnel?: string
          variant?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_exposures_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_tests: {
        Row: {
          action: string
          arrete_le: string | null
          canal: string | null
          code: string
          conclusion: string | null
          created_at: string
          cree_par: string | null
          demarre_le: string
          etape: string
          id: string
          libelle: string
          metrique: string
          statut: string
          tunnel: string
          variants: string[]
          weights: number[]
        }
        Insert: {
          action: string
          arrete_le?: string | null
          canal?: string | null
          code: string
          conclusion?: string | null
          created_at?: string
          cree_par?: string | null
          demarre_le?: string
          etape?: string
          id?: string
          libelle: string
          metrique?: string
          statut?: string
          tunnel: string
          variants: string[]
          weights: number[]
        }
        Update: {
          action?: string
          arrete_le?: string | null
          canal?: string | null
          code?: string
          conclusion?: string | null
          created_at?: string
          cree_par?: string | null
          demarre_le?: string
          etape?: string
          id?: string
          libelle?: string
          metrique?: string
          statut?: string
          tunnel?: string
          variants?: string[]
          weights?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "ab_tests_cree_par_fkey"
            columns: ["cree_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "call_activities_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "leads_enriched"
            referencedColumns: ["any_call_id"]
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
            referencedColumns: ["any_call_id"]
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
      card_update_links: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          sale_id: string | null
          status: string
          stripe_subscription_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          sale_id?: string | null
          status?: string
          stripe_subscription_id: string
          token: string
          used_at?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          sale_id?: string | null
          status?: string
          stripe_subscription_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_update_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_update_links_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "marketing_ventes_attribuees"
            referencedColumns: ["vente_id"]
          },
          {
            foreignKeyName: "card_update_links_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "recon_sale_verdict"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "card_update_links_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
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
      client_contracts: {
        Row: {
          agreements_snapshot: Json
          amount_original: number
          amount_total: number
          buyer_profile_id: string | null
          client_address: string
          client_city: string
          client_country: string
          client_email: string
          client_first_name: string
          client_last_name: string
          client_phone: string
          client_postal_code: string
          contact_id: string | null
          contract_number: string
          coupon_code: string | null
          created_at: string
          discount_amount: number
          email_sent_at: string | null
          email_sent_to: string | null
          first_payment_date: string
          id: string
          installments_count: number
          last_attempt_at: string | null
          last_error: string | null
          payment_modality: string
          sale_id: string
          signature_ip: string | null
          signature_png_path: string | null
          signature_user_agent: string | null
          signed_at: string | null
          signed_pdf_path: string | null
          status: string
          template_key: string
          unsigned_pdf_path: string | null
          updated_at: string
        }
        Insert: {
          agreements_snapshot?: Json
          amount_original: number
          amount_total: number
          buyer_profile_id?: string | null
          client_address: string
          client_city: string
          client_country: string
          client_email: string
          client_first_name: string
          client_last_name: string
          client_phone: string
          client_postal_code: string
          contact_id?: string | null
          contract_number: string
          coupon_code?: string | null
          created_at?: string
          discount_amount?: number
          email_sent_at?: string | null
          email_sent_to?: string | null
          first_payment_date: string
          id?: string
          installments_count?: number
          last_attempt_at?: string | null
          last_error?: string | null
          payment_modality: string
          sale_id: string
          signature_ip?: string | null
          signature_png_path?: string | null
          signature_user_agent?: string | null
          signed_at?: string | null
          signed_pdf_path?: string | null
          status?: string
          template_key: string
          unsigned_pdf_path?: string | null
          updated_at?: string
        }
        Update: {
          agreements_snapshot?: Json
          amount_original?: number
          amount_total?: number
          buyer_profile_id?: string | null
          client_address?: string
          client_city?: string
          client_country?: string
          client_email?: string
          client_first_name?: string
          client_last_name?: string
          client_phone?: string
          client_postal_code?: string
          contact_id?: string | null
          contract_number?: string
          coupon_code?: string | null
          created_at?: string
          discount_amount?: number
          email_sent_at?: string | null
          email_sent_to?: string | null
          first_payment_date?: string
          id?: string
          installments_count?: number
          last_attempt_at?: string | null
          last_error?: string | null
          payment_modality?: string
          sale_id?: string
          signature_ip?: string | null
          signature_png_path?: string | null
          signature_user_agent?: string | null
          signed_at?: string | null
          signed_pdf_path?: string | null
          status?: string
          template_key?: string
          unsigned_pdf_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contracts_buyer_profile_id_fkey"
            columns: ["buyer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "marketing_ventes_attribuees"
            referencedColumns: ["vente_id"]
          },
          {
            foreignKeyName: "client_contracts_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "recon_sale_verdict"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "client_contracts_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
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
            referencedRelation: "marketing_ventes_attribuees"
            referencedColumns: ["vente_id"]
          },
          {
            foreignKeyName: "client_invoices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "recon_sale_verdict"
            referencedColumns: ["sale_id"]
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
      closing_plan90: {
        Row: {
          data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      coaching_weekly_slots: {
        Row: {
          coach: string
          coach_type_id: string | null
          created_at: string
          day: string
          display_order: number
          duration_minutes: number
          emoji: string | null
          hour: number
          id: string
          is_active: boolean
          minute: number
          title: string
          updated_at: string
        }
        Insert: {
          coach: string
          coach_type_id?: string | null
          created_at?: string
          day: string
          display_order?: number
          duration_minutes?: number
          emoji?: string | null
          hour: number
          id: string
          is_active?: boolean
          minute?: number
          title: string
          updated_at?: string
        }
        Update: {
          coach?: string
          coach_type_id?: string | null
          created_at?: string
          day?: string
          display_order?: number
          duration_minutes?: number
          emoji?: string | null
          hour?: number
          id?: string
          is_active?: boolean
          minute?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_weekly_slots_coach_type_id_fkey"
            columns: ["coach_type_id"]
            isOneToOne: false
            referencedRelation: "coach_types"
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
            referencedRelation: "marketing_ventes_attribuees"
            referencedColumns: ["vente_id"]
          },
          {
            foreignKeyName: "commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "recon_sale_verdict"
            referencedColumns: ["sale_id"]
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
      commissions_backup_20260701: {
        Row: {
          amount: number | null
          beneficiary_external: string | null
          beneficiary_user_id: string | null
          created_at: string | null
          id: string | null
          paid_at: string | null
          payment_id: string | null
          percentage: number | null
          role: string | null
          sale_id: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          beneficiary_external?: string | null
          beneficiary_user_id?: string | null
          created_at?: string | null
          id?: string | null
          paid_at?: string | null
          payment_id?: string | null
          percentage?: number | null
          role?: string | null
          sale_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          beneficiary_external?: string | null
          beneficiary_user_id?: string | null
          created_at?: string | null
          id?: string | null
          paid_at?: string | null
          payment_id?: string | null
          percentage?: number | null
          role?: string | null
          sale_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      conferences: {
        Row: {
          calendly_url: string | null
          conference_date: string
          created_at: string
          id: string
          ready_at: string | null
          replay_code: string | null
          replay_url: string | null
          starts_at_local: string | null
          status: string
          token: string
          updated_at: string
          video_duration_min: number | null
          whatsapp_group_url: string | null
        }
        Insert: {
          calendly_url?: string | null
          conference_date: string
          created_at?: string
          id?: string
          ready_at?: string | null
          replay_code?: string | null
          replay_url?: string | null
          starts_at_local?: string | null
          status?: string
          token: string
          updated_at?: string
          video_duration_min?: number | null
          whatsapp_group_url?: string | null
        }
        Update: {
          calendly_url?: string | null
          conference_date?: string
          created_at?: string
          id?: string
          ready_at?: string | null
          replay_code?: string | null
          replay_url?: string | null
          starts_at_local?: string | null
          status?: string
          token?: string
          updated_at?: string
          video_duration_min?: number | null
          whatsapp_group_url?: string | null
        }
        Relationships: []
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
      coupons: {
        Row: {
          active: boolean
          applies_to_categories: string[] | null
          applies_to_offer_ids: string[] | null
          code: string
          created_at: string
          discount_amount_eur: number | null
          discount_percent: number | null
          discount_type: string
          expires_at: string | null
          id: string
          is_conference: boolean
          max_redemptions: number | null
          requires_active_pass: string | null
          stripe_coupon_id: string | null
          times_redeemed: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          applies_to_categories?: string[] | null
          applies_to_offer_ids?: string[] | null
          code: string
          created_at?: string
          discount_amount_eur?: number | null
          discount_percent?: number | null
          discount_type?: string
          expires_at?: string | null
          id?: string
          is_conference?: boolean
          max_redemptions?: number | null
          requires_active_pass?: string | null
          stripe_coupon_id?: string | null
          times_redeemed?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          applies_to_categories?: string[] | null
          applies_to_offer_ids?: string[] | null
          code?: string
          created_at?: string
          discount_amount_eur?: number | null
          discount_percent?: number | null
          discount_type?: string
          expires_at?: string | null
          id?: string
          is_conference?: boolean
          max_redemptions?: number | null
          requires_active_pass?: string | null
          stripe_coupon_id?: string | null
          times_redeemed?: number
          updated_at?: string
        }
        Relationships: []
      }
      discord_links: {
        Row: {
          discord_avatar: string | null
          discord_global_name: string | null
          discord_user_id: string
          discord_username: string
          is_guild_member: boolean | null
          link_source: string
          linked_at: string
          unlinked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          discord_avatar?: string | null
          discord_global_name?: string | null
          discord_user_id: string
          discord_username: string
          is_guild_member?: boolean | null
          link_source?: string
          linked_at?: string
          unlinked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          discord_avatar?: string | null
          discord_global_name?: string | null
          discord_user_id?: string
          discord_username?: string
          is_guild_member?: boolean | null
          link_source?: string
          linked_at?: string
          unlinked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_role_grants: {
        Row: {
          created_at: string
          discord_role_id: string
          discord_user_id: string
          error_message: string | null
          formation_id: string | null
          granted_at: string
          granted_by: string | null
          id: string
          reason: string
          revoked_at: string | null
          source: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discord_role_id: string
          discord_user_id: string
          error_message?: string | null
          formation_id?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          reason: string
          revoked_at?: string | null
          source: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discord_role_id?: string
          discord_user_id?: string
          error_message?: string | null
          formation_id?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          reason?: string
          revoked_at?: string | null
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_role_grants_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_role_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_role_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaign_events: {
        Row: {
          click_url: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          occurred_at: string
          payload: Json | null
          resend_email_id: string
          user_agent: string | null
        }
        Insert: {
          click_url?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          occurred_at?: string
          payload?: Json | null
          resend_email_id: string
          user_agent?: string | null
        }
        Update: {
          click_url?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          occurred_at?: string
          payload?: Json | null
          resend_email_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      email_campaign_recipients: {
        Row: {
          campaign_slug: string
          email: string
          first_name: string | null
          id: string
          position: number
        }
        Insert: {
          campaign_slug: string
          email: string
          first_name?: string | null
          id?: string
          position: number
        }
        Update: {
          campaign_slug?: string
          email?: string
          first_name?: string | null
          id?: string
          position?: number
        }
        Relationships: []
      }
      email_campaign_sends: {
        Row: {
          campaign_slug: string
          created_at: string
          email_seq: number
          error_message: string | null
          id: string
          recipient_email: string
          recipient_first_name: string | null
          resend_email_id: string | null
          sent_at: string
          status: string
          subject: string | null
        }
        Insert: {
          campaign_slug: string
          created_at?: string
          email_seq: number
          error_message?: string | null
          id?: string
          recipient_email: string
          recipient_first_name?: string | null
          resend_email_id?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
        }
        Update: {
          campaign_slug?: string
          created_at?: string
          email_seq?: number
          error_message?: string | null
          id?: string
          recipient_email?: string
          recipient_first_name?: string | null
          resend_email_id?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
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
      formation_discord_roles: {
        Row: {
          channel_ids: string[] | null
          created_at: string
          discord_role_id: string
          discord_role_label: string
          formation_id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          channel_ids?: string[] | null
          created_at?: string
          discord_role_id: string
          discord_role_label: string
          formation_id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          channel_ids?: string[] | null
          created_at?: string
          discord_role_id?: string
          discord_role_label?: string
          formation_id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formation_discord_roles_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: true
            referencedRelation: "formations"
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
          access_mode: string
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
          access_mode?: string
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
          access_mode?: string
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
            referencedRelation: "marketing_ventes_attribuees"
            referencedColumns: ["vente_id"]
          },
          {
            foreignKeyName: "invoice_lines_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "recon_sale_verdict"
            referencedColumns: ["sale_id"]
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
            foreignKeyName: "lead_quiz_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_enriched"
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
      lead_scoring_responses: {
        Row: {
          answers: Json
          category: string
          client_ip: string | null
          completed_at: string
          contact_email: string
          contact_first_name: string | null
          contact_last_name: string | null
          contact_phone: string | null
          created_at: string
          flags: string[]
          funnel_slug: string
          id: string
          pending_token_id: string | null
          score: number
          user_agent: string | null
        }
        Insert: {
          answers: Json
          category: string
          client_ip?: string | null
          completed_at?: string
          contact_email: string
          contact_first_name?: string | null
          contact_last_name?: string | null
          contact_phone?: string | null
          created_at?: string
          flags?: string[]
          funnel_slug: string
          id?: string
          pending_token_id?: string | null
          score: number
          user_agent?: string | null
        }
        Update: {
          answers?: Json
          category?: string
          client_ip?: string | null
          completed_at?: string
          contact_email?: string
          contact_first_name?: string | null
          contact_last_name?: string | null
          contact_phone?: string | null
          created_at?: string
          flags?: string[]
          funnel_slug?: string
          id?: string
          pending_token_id?: string | null
          score?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_scoring_responses_funnel_slug_fkey"
            columns: ["funnel_slug"]
            isOneToOne: false
            referencedRelation: "quiz_funnel_configs"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "lead_scoring_responses_pending_token_id_fkey"
            columns: ["pending_token_id"]
            isOneToOne: false
            referencedRelation: "pending_scoring_tokens"
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
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ab_test_code: string | null
          apporteur_id: string | null
          apporteur_source: string | null
          apporteur_source_detail: string | null
          assigned_at: string | null
          assigned_to: string | null
          auto_released_at: string | null
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
          tunnel_variant: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string | null
        }
        Insert: {
          ab_test_code?: string | null
          apporteur_id?: string | null
          apporteur_source?: string | null
          apporteur_source_detail?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          auto_released_at?: string | null
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
          tunnel_variant?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Update: {
          ab_test_code?: string | null
          apporteur_id?: string | null
          apporteur_source?: string | null
          apporteur_source_detail?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          auto_released_at?: string | null
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
          tunnel_variant?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
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
      liberty_module_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          data: Json
          id: string
          module_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          data?: Json
          id?: string
          module_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          data?: Json
          id?: string
          module_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      liberty_user_profile: {
        Row: {
          created_at: string
          data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketing_objectifs: {
        Row: {
          created_at: string
          id: string
          kpi: string
          mois: string
          updated_at: string
          updated_by: string | null
          valeur: number
        }
        Insert: {
          created_at?: string
          id?: string
          kpi: string
          mois: string
          updated_at?: string
          updated_by?: string | null
          valeur: number
        }
        Update: {
          created_at?: string
          id?: string
          kpi?: string
          mois?: string
          updated_at?: string
          updated_by?: string | null
          valeur?: number
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
      offers: {
        Row: {
          category: string
          created_at: string
          default_price_ht: number
          formation_id: string | null
          id: string
          label: string
          max_installments_count: number
          min_installments_count: number
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          default_price_ht: number
          formation_id?: string | null
          id?: string
          label: string
          max_installments_count?: number
          min_installments_count?: number
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          default_price_ht?: number
          formation_id?: string | null
          id?: string
          label?: string
          max_installments_count?: number
          min_installments_count?: number
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
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
            referencedRelation: "marketing_ventes_attribuees"
            referencedColumns: ["vente_id"]
          },
          {
            foreignKeyName: "payment_audit_log_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "recon_sale_verdict"
            referencedColumns: ["sale_id"]
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
      payment_links: {
        Row: {
          auto_generated: boolean
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          deferred_start_date: string | null
          deposit_amount: number | null
          grants_formation_ids: string[] | null
          grants_offer_id: string | null
          id: string
          installments_count: number
          notes: string | null
          paid_at: string | null
          prefilled_contact_id: string | null
          prefilled_email: string | null
          prefilled_full_name: string | null
          prefilled_phone: string | null
          product_label: string
          sale_id: string | null
          status: string
          token: string
          total_amount: number
        }
        Insert: {
          auto_generated?: boolean
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          deferred_start_date?: string | null
          deposit_amount?: number | null
          grants_formation_ids?: string[] | null
          grants_offer_id?: string | null
          id?: string
          installments_count?: number
          notes?: string | null
          paid_at?: string | null
          prefilled_contact_id?: string | null
          prefilled_email?: string | null
          prefilled_full_name?: string | null
          prefilled_phone?: string | null
          product_label: string
          sale_id?: string | null
          status?: string
          token: string
          total_amount: number
        }
        Update: {
          auto_generated?: boolean
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          deferred_start_date?: string | null
          deposit_amount?: number | null
          grants_formation_ids?: string[] | null
          grants_offer_id?: string | null
          id?: string
          installments_count?: number
          notes?: string | null
          paid_at?: string | null
          prefilled_contact_id?: string | null
          prefilled_email?: string | null
          prefilled_full_name?: string | null
          prefilled_phone?: string | null
          product_label?: string
          sale_id?: string | null
          status?: string
          token?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_grants_offer_id_fkey"
            columns: ["grants_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_prefilled_contact_id_fkey"
            columns: ["prefilled_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "marketing_ventes_attribuees"
            referencedColumns: ["vente_id"]
          },
          {
            foreignKeyName: "payment_links_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "recon_sale_verdict"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "payment_links_sale_id_fkey"
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
            referencedRelation: "marketing_ventes_attribuees"
            referencedColumns: ["vente_id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "recon_sale_verdict"
            referencedColumns: ["sale_id"]
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
      pending_scoring_tokens: {
        Row: {
          client_ip: string | null
          consumed: boolean
          consumed_at: string | null
          contact_email: string
          contact_first_name: string | null
          contact_last_name: string | null
          contact_phone: string | null
          created_at: string
          expires_at: string
          funnel_slug: string
          id: string
          raw_webhook_payload: Json | null
          systemio_contact_id: string | null
          user_agent: string | null
        }
        Insert: {
          client_ip?: string | null
          consumed?: boolean
          consumed_at?: string | null
          contact_email: string
          contact_first_name?: string | null
          contact_last_name?: string | null
          contact_phone?: string | null
          created_at?: string
          expires_at?: string
          funnel_slug: string
          id?: string
          raw_webhook_payload?: Json | null
          systemio_contact_id?: string | null
          user_agent?: string | null
        }
        Update: {
          client_ip?: string | null
          consumed?: boolean
          consumed_at?: string | null
          contact_email?: string
          contact_first_name?: string | null
          contact_last_name?: string | null
          contact_phone?: string | null
          created_at?: string
          expires_at?: string
          funnel_slug?: string
          id?: string
          raw_webhook_payload?: Json | null
          systemio_contact_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_scoring_tokens_funnel_slug_fkey"
            columns: ["funnel_slug"]
            isOneToOne: false
            referencedRelation: "quiz_funnel_configs"
            referencedColumns: ["slug"]
          },
        ]
      }
      personal_brand_weeks: {
        Row: {
          cycle_id: string
          cycle_started_at: string
          generated_at: string
          id: string
          mode: string
          published_at: string | null
          scripts: Json
          stories: Json
          theme: string
          user_id: string
          week_num: number
        }
        Insert: {
          cycle_id: string
          cycle_started_at: string
          generated_at?: string
          id?: string
          mode: string
          published_at?: string | null
          scripts?: Json
          stories?: Json
          theme: string
          user_id: string
          week_num: number
        }
        Update: {
          cycle_id?: string
          cycle_started_at?: string
          generated_at?: string
          id?: string
          mode?: string
          published_at?: string | null
          scripts?: Json
          stories?: Json
          theme?: string
          user_id?: string
          week_num?: number
        }
        Relationships: []
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
      quiz_funnel_configs: {
        Row: {
          active: boolean
          created_at: string
          name: string
          slug: string
          systemio_capture_url: string | null
          thank_you_url: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          name: string
          slug: string
          systemio_capture_url?: string | null
          thank_you_url: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          name?: string
          slug?: string
          systemio_capture_url?: string | null
          thank_you_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          archived_at: string | null
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
          archived_at?: string | null
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
          archived_at?: string | null
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
      rdv_funnel_answers: {
        Row: {
          answer: string
          answered_at: string
          id: string
          lead_id: string
          question_index: number
        }
        Insert: {
          answer: string
          answered_at?: string
          id?: string
          lead_id: string
          question_index: number
        }
        Update: {
          answer?: string
          answered_at?: string
          id?: string
          lead_id?: string
          question_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "rdv_funnel_answers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "rdv_funnel_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      rdv_funnel_leads: {
        Row: {
          booked_at: string | null
          calendly_call_id: string | null
          created_at: string
          disqualified_at_question: number | null
          email: string
          first_name: string
          id: string
          ip: string | null
          last_name: string
          phone: string
          phone_country: string | null
          qualified_at: string | null
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          booked_at?: string | null
          calendly_call_id?: string | null
          created_at?: string
          disqualified_at_question?: number | null
          email: string
          first_name: string
          id?: string
          ip?: string | null
          last_name: string
          phone: string
          phone_country?: string | null
          qualified_at?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          booked_at?: string | null
          calendly_call_id?: string | null
          created_at?: string
          disqualified_at_question?: number | null
          email?: string
          first_name?: string
          id?: string
          ip?: string | null
          last_name?: string
          phone?: string
          phone_country?: string | null
          qualified_at?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rdv_funnel_leads_calendly_call_id_fkey"
            columns: ["calendly_call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdv_funnel_leads_calendly_call_id_fkey"
            columns: ["calendly_call_id"]
            isOneToOne: false
            referencedRelation: "calls_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdv_funnel_leads_calendly_call_id_fkey"
            columns: ["calendly_call_id"]
            isOneToOne: false
            referencedRelation: "leads_enriched"
            referencedColumns: ["any_call_id"]
          },
          {
            foreignKeyName: "rdv_funnel_leads_calendly_call_id_fkey"
            columns: ["calendly_call_id"]
            isOneToOne: false
            referencedRelation: "leads_enriched"
            referencedColumns: ["contact_call_id"]
          },
        ]
      }
      recon_run_log: {
        Row: {
          chunk: number | null
          chunk_size: number | null
          customers_found: number | null
          emails_processed: number | null
          events_upserted: number | null
          id: number
          note: string | null
          ran_at: string
          subs_upserted: number | null
        }
        Insert: {
          chunk?: number | null
          chunk_size?: number | null
          customers_found?: number | null
          emails_processed?: number | null
          events_upserted?: number | null
          id?: number
          note?: string | null
          ran_at?: string
          subs_upserted?: number | null
        }
        Update: {
          chunk?: number | null
          chunk_size?: number | null
          customers_found?: number | null
          emails_processed?: number | null
          events_upserted?: number | null
          id?: number
          note?: string | null
          ran_at?: string
          subs_upserted?: number | null
        }
        Relationships: []
      }
      recon_sale_extra_customer: {
        Row: {
          customer_id: string
          sale_id: string
          snapshot_at: string
          source_id: string | null
          via: string | null
        }
        Insert: {
          customer_id: string
          sale_id: string
          snapshot_at?: string
          source_id?: string | null
          via?: string | null
        }
        Update: {
          customer_id?: string
          sale_id?: string
          snapshot_at?: string
          source_id?: string | null
          via?: string | null
        }
        Relationships: []
      }
      recon_stripe_customers: {
        Row: {
          created_at: string | null
          customer_id: string
          delinquent: boolean | null
          email: string | null
          name: string | null
          raw: Json | null
          snapshot_at: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          delinquent?: boolean | null
          email?: string | null
          name?: string | null
          raw?: Json | null
          snapshot_at?: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          delinquent?: boolean | null
          email?: string | null
          name?: string | null
          raw?: Json | null
          snapshot_at?: string
        }
        Relationships: []
      }
      recon_stripe_events: {
        Row: {
          amount_eur: number | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          description: string | null
          email: string
          invoice_number: string | null
          object_id: string
          object_type: string
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          raw: Json | null
          snapshot_at: string
          status: string | null
          subscription_id: string | null
          succeeded: boolean | null
        }
        Insert: {
          amount_eur?: number | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          description?: string | null
          email: string
          invoice_number?: string | null
          object_id: string
          object_type: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          raw?: Json | null
          snapshot_at?: string
          status?: string | null
          subscription_id?: string | null
          succeeded?: boolean | null
        }
        Update: {
          amount_eur?: number | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          description?: string | null
          email?: string
          invoice_number?: string | null
          object_id?: string
          object_type?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          raw?: Json | null
          snapshot_at?: string
          status?: string | null
          subscription_id?: string | null
          succeeded?: boolean | null
        }
        Relationships: []
      }
      recon_stripe_subscriptions: {
        Row: {
          amount_eur: number | null
          cancel_at: string | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          customer_id: string | null
          email: string | null
          has_schedule: boolean | null
          interval: string | null
          raw: Json | null
          snapshot_at: string
          status: string | null
          subscription_id: string
        }
        Insert: {
          amount_eur?: number | null
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          customer_id?: string | null
          email?: string | null
          has_schedule?: boolean | null
          interval?: string | null
          raw?: Json | null
          snapshot_at?: string
          status?: string | null
          subscription_id: string
        }
        Update: {
          amount_eur?: number | null
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          customer_id?: string | null
          email?: string | null
          has_schedule?: boolean | null
          interval?: string | null
          raw?: Json | null
          snapshot_at?: string
          status?: string | null
          subscription_id?: string
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
            foreignKeyName: "sales_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "leads_enriched"
            referencedColumns: ["any_call_id"]
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
            referencedRelation: "marketing_ventes_attribuees"
            referencedColumns: ["vente_id"]
          },
          {
            foreignKeyName: "sales_parent_sale_id_fkey"
            columns: ["parent_sale_id"]
            isOneToOne: false
            referencedRelation: "recon_sale_verdict"
            referencedColumns: ["sale_id"]
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
      sms_campaign_events: {
        Row: {
          event_type: string
          id: string
          occurred_at: string
          payload: Json | null
          twilio_message_sid: string
        }
        Insert: {
          event_type: string
          id?: string
          occurred_at?: string
          payload?: Json | null
          twilio_message_sid: string
        }
        Update: {
          event_type?: string
          id?: string
          occurred_at?: string
          payload?: Json | null
          twilio_message_sid?: string
        }
        Relationships: []
      }
      sms_campaign_recipients: {
        Row: {
          campaign_slug: string
          email: string
          first_name: string | null
          id: string
          phone: string
          position: number
          unsubscribe_token: string
        }
        Insert: {
          campaign_slug: string
          email: string
          first_name?: string | null
          id?: string
          phone: string
          position: number
          unsubscribe_token: string
        }
        Update: {
          campaign_slug?: string
          email?: string
          first_name?: string | null
          id?: string
          phone?: string
          position?: number
          unsubscribe_token?: string
        }
        Relationships: []
      }
      sms_campaign_sends: {
        Row: {
          body: string | null
          campaign_slug: string
          error_message: string | null
          id: string
          num_segments: number | null
          price_usd: number | null
          recipient_first_name: string | null
          recipient_phone: string
          sent_at: string
          sms_seq: number
          status: string
          twilio_message_sid: string | null
        }
        Insert: {
          body?: string | null
          campaign_slug: string
          error_message?: string | null
          id?: string
          num_segments?: number | null
          price_usd?: number | null
          recipient_first_name?: string | null
          recipient_phone: string
          sent_at?: string
          sms_seq: number
          status?: string
          twilio_message_sid?: string | null
        }
        Update: {
          body?: string | null
          campaign_slug?: string
          error_message?: string | null
          id?: string
          num_segments?: number | null
          price_usd?: number | null
          recipient_first_name?: string | null
          recipient_phone?: string
          sent_at?: string
          sms_seq?: number
          status?: string
          twilio_message_sid?: string | null
        }
        Relationships: []
      }
      sms_unsubscribes: {
        Row: {
          id: string
          ip_address: string | null
          phone: string
          source: string | null
          unsubscribed_at: string
          user_agent: string | null
        }
        Insert: {
          id?: string
          ip_address?: string | null
          phone: string
          source?: string | null
          unsubscribed_at?: string
          user_agent?: string | null
        }
        Update: {
          id?: string
          ip_address?: string | null
          phone?: string
          source?: string | null
          unsubscribed_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      studio_broll_pending_jobs: {
        Row: {
          created_at: string
          durations: number[]
          error_message: string | null
          id: string
          kling_request_id: string
          project_id: string
          prompts: string[]
          segment_indices: number[]
          status: string
          total_duration_s: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          durations: number[]
          error_message?: string | null
          id?: string
          kling_request_id: string
          project_id: string
          prompts: string[]
          segment_indices: number[]
          status?: string
          total_duration_s: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          durations?: number[]
          error_message?: string | null
          id?: string
          kling_request_id?: string
          project_id?: string
          prompts?: string[]
          segment_indices?: number[]
          status?: string
          total_duration_s?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_broll_pending_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_projects: {
        Row: {
          audio_duration_seconds: number | null
          audio_path: string | null
          cost_cents: number | null
          created_at: string
          error_message: string | null
          id: string
          job_id: string | null
          output_duration_seconds: number | null
          output_path: string | null
          reference_image_path: string | null
          script_text: string | null
          segments_json: Json | null
          source: Database["public"]["Enums"]["studio_project_source"]
          source_personal_brand: Json | null
          status: Database["public"]["Enums"]["studio_project_status"]
          title: string | null
          transcript_json: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_duration_seconds?: number | null
          audio_path?: string | null
          cost_cents?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_id?: string | null
          output_duration_seconds?: number | null
          output_path?: string | null
          reference_image_path?: string | null
          script_text?: string | null
          segments_json?: Json | null
          source?: Database["public"]["Enums"]["studio_project_source"]
          source_personal_brand?: Json | null
          status?: Database["public"]["Enums"]["studio_project_status"]
          title?: string | null
          transcript_json?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_duration_seconds?: number | null
          audio_path?: string | null
          cost_cents?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_id?: string | null
          output_duration_seconds?: number | null
          output_path?: string | null
          reference_image_path?: string | null
          script_text?: string | null
          segments_json?: Json | null
          source?: Database["public"]["Enums"]["studio_project_source"]
          source_personal_brand?: Json | null
          status?: Database["public"]["Enums"]["studio_project_status"]
          title?: string | null
          transcript_json?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      studio_render_jobs: {
        Row: {
          caption_preset: string
          created_at: string
          duration_s: number | null
          error_message: string | null
          id: string
          project_id: string
          render_id: string
          size_bytes: number | null
          status: string
          updated_at: string
        }
        Insert: {
          caption_preset?: string
          created_at?: string
          duration_s?: number | null
          error_message?: string | null
          id?: string
          project_id: string
          render_id: string
          size_bytes?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          caption_preset?: string
          created_at?: string
          duration_s?: number | null
          error_message?: string | null
          id?: string
          project_id?: string
          render_id?: string
          size_bytes?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_render_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
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
          current_cycle_id: string | null
          current_cycle_started_at: string | null
          generated_profiles: Json | null
          mode: string
          profiles_generated_at: string | null
          started_at: string | null
          step1_confirmed_at: string | null
          step2_confirmed_at: string | null
          topics_history: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          current_cycle_id?: string | null
          current_cycle_started_at?: string | null
          generated_profiles?: Json | null
          mode: string
          profiles_generated_at?: string | null
          started_at?: string | null
          step1_confirmed_at?: string | null
          step2_confirmed_at?: string | null
          topics_history?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          current_cycle_id?: string | null
          current_cycle_started_at?: string | null
          generated_profiles?: Json | null
          mode?: string
          profiles_generated_at?: string | null
          started_at?: string | null
          step1_confirmed_at?: string | null
          step2_confirmed_at?: string | null
          topics_history?: Json | null
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
            referencedColumns: ["any_call_id"]
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
      email_campaign_duplicates: {
        Row: {
          campaign_slug: string | null
          dernier_envoi: string | null
          ecart_secondes: number | null
          email_seq: number | null
          nb_envois: number | null
          premier_envoi: string | null
          recipient_email: string | null
          recipient_first_name: string | null
        }
        Relationships: []
      }
      email_campaign_recipient_status: {
        Row: {
          bounced_at: string | null
          campaign_slug: string | null
          clicked_at: string | null
          complained_at: string | null
          delivered_at: string | null
          email_seq: number | null
          error_message: string | null
          has_failure: boolean | null
          opened_at: string | null
          recipient_email: string | null
          recipient_first_name: string | null
          sent_at: string | null
          unsubscribed_at: string | null
        }
        Relationships: []
      }
      email_campaign_stats: {
        Row: {
          campaign_slug: string | null
          dernier_envoi_at: string | null
          email_seq: number | null
          nb_bounces: number | null
          nb_clics: number | null
          nb_complaints: number | null
          nb_delivres: number | null
          nb_desabos: number | null
          nb_echec_envoi: number | null
          nb_envoyes: number | null
          nb_ouverts: number | null
          premier_envoi_at: string | null
        }
        Relationships: []
      }
      leads_enriched: {
        Row: {
          any_call_id: string | null
          any_call_scheduled_at: string | null
          any_call_status: string | null
          apporteur_id: string | null
          apporteur_name: string | null
          assigned_at: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          auto_released_at: string | null
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
          has_any_call: boolean | null
          id: string | null
          notes: string | null
          quiz_answers: Json | null
          quiz_category: string | null
          quiz_completed_at: string | null
          quiz_filled: boolean | null
          quiz_flags: string[] | null
          quiz_score: number | null
          raw_email: string | null
          raw_full_name: string | null
          raw_phone: string | null
          recycled_at: string | null
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
      marketing_ventes_attribuees: {
        Row: {
          amount_ht: number | null
          conference_date: string | null
          contact_id: string | null
          lead_id: string | null
          mode_attribution: string | null
          product: string | null
          sold_at: string | null
          vente_id: string | null
        }
        Insert: {
          amount_ht?: number | null
          conference_date?: string | null
          contact_id?: string | null
          lead_id?: never
          mode_attribution?: never
          product?: string | null
          sold_at?: string | null
          vente_id?: string | null
        }
        Update: {
          amount_ht?: number | null
          conference_date?: string | null
          contact_id?: string | null
          lead_id?: never
          mode_attribution?: never
          product?: string | null
          sold_at?: string | null
          vente_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
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
      recon_sale_verdict: {
        Row: {
          email: string | null
          full_name: string | null
          gap_eur: number | null
          has_customer: boolean | null
          is_systemeio: boolean | null
          mensualites: number | null
          multi_sale: boolean | null
          over_plan_eur: number | null
          overcharge_risk: boolean | null
          p_late_cnt: number | null
          p_lost_cnt: number | null
          p_max_due: string | null
          p_min_due: string | null
          p_next_pending_due: string | null
          p_overdue_cnt: number | null
          p_overdue_sum: number | null
          p_paid_cnt: number | null
          p_paid_sum: number | null
          p_pending_cnt: number | null
          p_total: number | null
          product: string | null
          s_fail_cnt: number | null
          s_first_succ: string | null
          s_last_succ: string | null
          s_live_period_end: string | null
          s_live_sub_cnt: number | null
          s_succ_cnt: number | null
          s_succ_sum: number | null
          sale_id: string | null
          sale_status: string | null
          sale_type: string | null
          sold_date: string | null
          verdict: string | null
        }
        Relationships: []
      }
      sms_campaign_recipient_status: {
        Row: {
          campaign_slug: string | null
          clicked_at: string | null
          delivered_at: string | null
          failed_at: string | null
          has_failure: boolean | null
          recipient_first_name: string | null
          recipient_phone: string | null
          sent_at: string | null
          sms_seq: number | null
          total_price: number | null
          total_segments: number | null
        }
        Relationships: []
      }
      sms_campaign_stats: {
        Row: {
          campaign_slug: string | null
          dernier_envoi_at: string | null
          nb_clics: number | null
          nb_delivres: number | null
          nb_echec_envoi: number | null
          nb_envoyes: number | null
          nb_failed: number | null
          premier_envoi_at: string | null
          sms_seq: number | null
          total_price_usd: number | null
          total_segments: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      ab_test_resultats: {
        Args: { p_code: string }
        Returns: {
          ca: number
          conversions: number
          poids: number
          variant: string
          ventes: number
          visiteurs: number
        }[]
      }
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
      admin_discord_overview: {
        Args: never
        Returns: {
          discord_avatar: string
          discord_global_name: string
          discord_role_id: string
          discord_role_label: string
          discord_user_id: string
          discord_username: string
          email: string
          formation_id: string
          formation_slug: string
          formation_titre: string
          full_name: string
          grant_error: string
          grant_id: string
          grant_reason: string
          grant_source: string
          grant_status: string
          granted_at: string
          is_guild_member: boolean
          progress_pct: number
          user_id: string
          user_role: string
        }[]
      }
      admin_discord_user_recap: {
        Args: never
        Returns: {
          closing_completed: boolean
          discord_avatar: string
          discord_global_name: string
          discord_linked: boolean
          discord_username: string
          email: string
          full_name: string
          has_closing_role: boolean
          has_marketing_role: boolean
          has_setting_role: boolean
          is_guild_member: boolean
          marketing_completed: boolean
          pass_type: string
          setting_completed: boolean
          user_id: string
          user_role: string
        }[]
      }
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
      claim_lead_from_pool: { Args: { p_lead_id: string }; Returns: undefined }
      compute_sale_payment_status: {
        Args: { p_sale_id: string }
        Returns: string
      }
      conference_courante: {
        Args: never
        Returns: {
          conference_date: string
          starts_at_local: string
          whatsapp_group_url: string
        }[]
      }
      create_card_update_link: {
        Args: {
          p_contact_id: string
          p_sale_id: string
          p_stripe_subscription_id: string
        }
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
      create_formation_payment_link: {
        Args: {
          p_deferred_start?: string
          p_installments?: number
          p_offer_slug: string
          p_prefill_email?: string
          p_prefill_full_name?: string
          p_prefill_phone?: string
        }
        Returns: Json
      }
      create_pass_payment_link: {
        Args: {
          p_deferred_start: string
          p_installments: number
          p_pass_slug: string
          p_prefill_email?: string
          p_prefill_full_name?: string
          p_prefill_phone?: string
        }
        Returns: Json
      }
      create_payment_link: {
        Args: {
          p_deferred_start_date?: string
          p_deposit_amount?: number
          p_grants_formation_ids?: string[]
          p_grants_offer_id?: string
          p_installments_count?: number
          p_notes?: string
          p_prefilled_email?: string
          p_prefilled_full_name?: string
          p_prefilled_phone?: string
          p_product_label: string
          p_total_amount: number
        }
        Returns: Json
      }
      delete_payment_admin: {
        Args: { p_payment_id: string }
        Returns: undefined
      }
      delete_sale_admin: { Args: { p_sale_id: string }; Returns: undefined }
      dispatch_lead_to: {
        Args: { p_lead_id: string; p_target_user_id: string }
        Returns: undefined
      }
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
      generate_weekly_conferences: {
        Args: {
          p_default_calendly_url?: string
          p_end_date: string
          p_start_date: string
          p_weekday?: number
        }
        Returns: {
          created_count: number
          skipped_count: number
          total_in_range: number
        }[]
      }
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
      get_contact_leads_index: {
        Args: { p_contact_ids: string[] }
        Returns: Json
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
      is_formation_complete_for_user: {
        Args: { p_formation: string; p_user: string }
        Returns: boolean
      }
      is_quiz_slug_available: { Args: { p_slug: string }; Returns: boolean }
      lookup_a_la_carte_offer: {
        Args: { p_slug: string }
        Returns: {
          default_price_ht: number
          is_valid: boolean
          label: string
          max_installments_count: number
          min_installments_count: number
          offer_id: string
          reason: string
        }[]
      }
      lookup_card_update_token: {
        Args: { p_token: string }
        Returns: {
          email: string
          full_name: string
          is_valid: boolean
          product: string
          reason: string
        }[]
      }
      lookup_conference_replay: {
        Args: { p_token: string }
        Returns: {
          calendly_url: string
          conference_date: string
          is_valid: boolean
          reason: string
          replay_code: string
          replay_url: string
          video_duration_min: number
        }[]
      }
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
      lookup_payment_link: {
        Args: { p_token: string }
        Returns: {
          deferred_start_date: string
          deposit_amount: number
          expected_coupon_category: string
          installments_count: number
          is_valid: boolean
          link_id: string
          prefilled_email: string
          prefilled_full_name: string
          prefilled_phone: string
          product_label: string
          reason: string
          total_amount: number
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
      marketing_canal: {
        Args: { p_source: string; p_utm_source: string }
        Returns: string
      }
      marketing_origine_rdv: { Args: { p_event_type: string }; Returns: string }
      marketing_perf: {
        Args: { p_from: string; p_mode: string; p_to: string }
        Returns: {
          ca: number
          canal: string
          depense: number
          leads: number
          tunnel: string
          ventes: number
        }[]
      }
      marketing_rdv: {
        Args: { p_from: string; p_mode: string; p_to: string }
        Returns: {
          annules: number
          honores: number
          no_show: number
          origine: string
          rdv: number
        }[]
      }
      marketing_tunnel: { Args: { p_source: string }; Returns: string }
      marketing_tunnel_campagne: {
        Args: { p_campaign: string; p_channel: string }
        Returns: string
      }
      move_chapitre: {
        Args: {
          p_chapitre_id: string
          p_target_module_id: string
          p_target_ordre: number
        }
        Returns: undefined
      }
      next_apporteur_invoice_number: {
        Args: { p_apporteur_id: string; p_month: number; p_year: number }
        Returns: string
      }
      next_client_invoice_number: {
        Args: { p_month: number; p_year: number }
        Returns: string
      }
      next_contract_number: {
        Args: { p_month: number; p_year: number }
        Returns: string
      }
      next_organisation_plan_version: {
        Args: { p_user_id: string }
        Returns: number
      }
      next_sunday_noon_paris_after: { Args: { p_ts: string }; Returns: string }
      nextval_certificate_seq: { Args: never; Returns: number }
      normalize_apporteur_name: { Args: { p_name: string }; Returns: string }
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
      release_overdue_apported_leads: { Args: never; Returns: number }
      renumber_apporteur_invoices: {
        Args: never
        Returns: {
          id: string
          new_number: string
          old_number: string
        }[]
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
      reorder_parcours_chapitres: {
        Args: { p_ordered_ids: string[]; p_phase_id: string }
        Returns: undefined
      }
      reorder_parcours_phases: {
        Args: { p_ordered_ids: string[]; p_parcours_id: string }
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
      team_activity_stats: {
        Args: { p_from: string; p_to: string }
        Returns: {
          collaborateur_level: string
          full_name: string
          nb_activities: number
          nb_leads_handled: number
          role: string
          user_id: string
        }[]
      }
      team_qualification_stats: {
        Args: { p_from: string; p_to: string }
        Returns: {
          collaborateur_level: string
          full_name: string
          nb_inscrit_conf: number
          nb_leads_handled: number
          role: string
          taux_qualif: number
          user_id: string
        }[]
      }
      team_sales_rankings: {
        Args: { p_from: string; p_to: string }
        Returns: {
          full_name: string
          montant_commissions: number
          montant_total_ht: number
          nb_ventes: number
          role: string
          user_id: string
        }[]
      }
      try_complete_parcours_formation: {
        Args: { p_formation: string; p_user: string }
        Returns: undefined
      }
      unlink_discord: { Args: never; Returns: undefined }
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
      update_payment_link: {
        Args: {
          p_deferred_start_date?: string
          p_grants_formation_ids?: string[]
          p_grants_offer_id?: string
          p_id: string
          p_notes?: string
          p_prefilled_email?: string
          p_prefilled_full_name?: string
          p_prefilled_phone?: string
        }
        Returns: Json
      }
      update_studio_segment_broll: {
        Args: {
          p_broll_end_ms?: number
          p_broll_path: string
          p_broll_prompt: string
          p_broll_start_ms?: number
          p_project_id: string
          p_segment_idx: number
        }
        Returns: Json
      }
      user_active_pass_level: { Args: { p_user_id: string }; Returns: string }
      validate_coupon:
        | { Args: { p_code: string }; Returns: Json }
        | {
            Args: { p_code: string; p_expected_category: string }
            Returns: Json
          }
        | {
            Args: {
              p_code: string
              p_email: string
              p_expected_category: string
            }
            Returns: Json
          }
    }
    Enums: {
      group_session_status: "scheduled" | "live" | "completed" | "cancelled"
      meeting_provider: "zoom" | "meet" | "teams" | "other"
      pass_type: "al_baraka" | "liberty"
      recurrence_frequency: "none" | "weekly" | "biweekly" | "monthly"
      studio_project_source: "manual" | "personal_brand"
      studio_project_status:
        | "draft"
        | "audio_uploaded"
        | "transcribed"
        | "broll_ready"
        | "processing"
        | "done"
        | "failed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      studio_project_source: ["manual", "personal_brand"],
      studio_project_status: [
        "draft",
        "audio_uploaded",
        "transcribed",
        "broll_ready",
        "processing",
        "done",
        "failed",
      ],
    },
  },
} as const
