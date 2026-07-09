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
      appointment_status_history: {
        Row: {
          appointment_id: string
          changed_at: string
          changed_by: string | null
          id: string
          new_status: string
          old_status: string | null
          reason: string | null
        }
        Insert: {
          appointment_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: string
          old_status?: string | null
          reason?: string | null
        }
        Update: {
          appointment_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: string
          old_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_status_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          cancel_reason: string | null
          cancelled_at: string | null
          checked_in_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          customer_note: string | null
          end_at: string | null
          end_time: string
          expires_at: string | null
          id: string
          internal_note: string | null
          room_id: string | null
          service_variant_id: string
          source: string
          staff_id: string | null
          start_at: string | null
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          customer_note?: string | null
          end_at?: string | null
          end_time: string
          expires_at?: string | null
          id?: string
          internal_note?: string | null
          room_id?: string | null
          service_variant_id: string
          source: string
          staff_id?: string | null
          start_at?: string | null
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          customer_note?: string | null
          end_at?: string | null
          end_time?: string
          expires_at?: string | null
          id?: string
          internal_note?: string | null
          room_id?: string | null
          service_variant_id?: string
          source?: string
          staff_id?: string | null
          start_at?: string | null
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_variant_id_fkey"
            columns: ["service_variant_id"]
            isOneToOne: false
            referencedRelation: "service_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          target_id?: string | null
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          close_time: string | null
          is_closed: boolean
          open_time: string | null
          weekday: number
        }
        Insert: {
          close_time?: string | null
          is_closed?: boolean
          open_time?: string | null
          weekday: number
        }
        Update: {
          close_time?: string | null
          is_closed?: boolean
          open_time?: string | null
          weekday?: number
        }
        Relationships: []
      }
      checkout_items: {
        Row: {
          appointment_id: string | null
          checkout_id: string
          created_at: string
          face_value: number
          id: string
          item_type: string
          paid_amount: number
          quantity: number
          service_variant_id: string | null
          staff_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          checkout_id: string
          created_at?: string
          face_value: number
          id?: string
          item_type?: string
          paid_amount: number
          quantity?: number
          service_variant_id?: string | null
          staff_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          checkout_id?: string
          created_at?: string
          face_value?: number
          id?: string
          item_type?: string
          paid_amount?: number
          quantity?: number
          service_variant_id?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_items_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_items_service_variant_id_fkey"
            columns: ["service_variant_id"]
            isOneToOne: false
            referencedRelation: "service_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_items_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_payments: {
        Row: {
          amount: number
          checkout_id: string
          created_at: string
          id: string
          method: string
          note: string | null
        }
        Insert: {
          amount: number
          checkout_id: string
          created_at?: string
          id?: string
          method: string
          note?: string | null
        }
        Update: {
          amount?: number
          checkout_id?: string
          created_at?: string
          id?: string
          method?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_payments_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
        ]
      }
      checkouts: {
        Row: {
          checked_out_by: string | null
          checkout_at: string
          created_at: string
          customer_id: string
          deposit_applied: number
          discount_amount: number
          ecpay_trade_no: string | null
          id: string
          invoice_status: string
          payment_method: string
          reopened_from_checkout_id: string | null
          status: string
          stored_value_bonus_used: number
          stored_value_principal_used: number
          subtotal_face_value: number
          total_paid_amount: number
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          checked_out_by?: string | null
          checkout_at?: string
          created_at?: string
          customer_id: string
          deposit_applied?: number
          discount_amount?: number
          ecpay_trade_no?: string | null
          id?: string
          invoice_status?: string
          payment_method: string
          reopened_from_checkout_id?: string | null
          status?: string
          stored_value_bonus_used?: number
          stored_value_principal_used?: number
          subtotal_face_value: number
          total_paid_amount: number
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          checked_out_by?: string | null
          checkout_at?: string
          created_at?: string
          customer_id?: string
          deposit_applied?: number
          discount_amount?: number
          ecpay_trade_no?: string | null
          id?: string
          invoice_status?: string
          payment_method?: string
          reopened_from_checkout_id?: string | null
          status?: string
          stored_value_bonus_used?: number
          stored_value_principal_used?: number
          subtotal_face_value?: number
          total_paid_amount?: number
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkouts_checked_out_by_fkey"
            columns: ["checked_out_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkouts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkouts_reopened_from_checkout_id_fkey"
            columns: ["reopened_from_checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkouts_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_records: {
        Row: {
          checkout_item_id: string
          commission_amount: number
          commission_rate: number
          created_at: string
          id: string
          settled: boolean
          settled_at: string | null
          settlement_batch_id: string | null
          staff_id: string
          voided: boolean
          voided_at: string | null
        }
        Insert: {
          checkout_item_id: string
          commission_amount: number
          commission_rate: number
          created_at?: string
          id?: string
          settled?: boolean
          settled_at?: string | null
          settlement_batch_id?: string | null
          staff_id: string
          voided?: boolean
          voided_at?: string | null
        }
        Update: {
          checkout_item_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          settled?: boolean
          settled_at?: string | null
          settlement_batch_id?: string | null
          staff_id?: string
          voided?: boolean
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_records_checkout_item_id_fkey"
            columns: ["checkout_item_id"]
            isOneToOne: true
            referencedRelation: "checkout_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_records_settlement_batch_id_fkey"
            columns: ["settlement_batch_id"]
            isOneToOne: false
            referencedRelation: "commission_settlement_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_settlement_batches: {
        Row: {
          confirmed_at: string | null
          created_at: string
          id: string
          paid_at: string | null
          period_end: string
          period_start: string
          staff_id: string
          status: string
          total_commission_amount: number
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end: string
          period_start: string
          staff_id: string
          status?: string
          total_commission_amount?: number
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          staff_id?: string
          status?: string
          total_commission_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_settlement_batches_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          checkout_id: string | null
          coupon_id: string
          customer_id: string
          id: string
          redeemed_at: string
        }
        Insert: {
          checkout_id?: string | null
          coupon_id: string
          customer_id: string
          id?: string
          redeemed_at?: string
        }
        Update: {
          checkout_id?: string | null
          coupon_id?: string
          customer_id?: string
          id?: string
          redeemed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount_amount: number | null
          min_spend: number | null
          name: string
          usage_limit_per_customer: number
          usage_limit_total: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_spend?: number | null
          name: string
          usage_limit_per_customer?: number
          usage_limit_total?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_spend?: number | null
          name?: string
          usage_limit_per_customer?: number
          usage_limit_total?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      customer_tags: {
        Row: {
          created_at: string
          customer_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tags_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birthday: string | null
          churn_risk_score: number | null
          created_at: string
          email: string | null
          gender: string | null
          id: string
          internal_note: string | null
          last_visit_at: string | null
          name: string
          phone: string | null
          profile_id: string | null
          rating: number | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          birthday?: string | null
          churn_risk_score?: number | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          internal_note?: string | null
          last_visit_at?: string | null
          name: string
          phone?: string | null
          profile_id?: string | null
          rating?: number | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          birthday?: string | null
          churn_risk_score?: number | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          internal_note?: string | null
          last_visit_at?: string | null
          name?: string
          phone?: string | null
          profile_id?: string | null
          rating?: number | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_records: {
        Row: {
          amount: number
          appointment_id: string
          applied_checkout_id: string | null
          covered_appointment_ids: string[]
          created_at: string
          ecpay_trade_no: string | null
          id: string
          merchant_trade_no: string
          note: string | null
          paid_at: string | null
          payment_method: string
          refunded_at: string | null
          status: string
          waived_by: string | null
          waived_by_at: string | null
        }
        Insert: {
          amount: number
          appointment_id: string
          applied_checkout_id?: string | null
          covered_appointment_ids?: string[]
          created_at?: string
          ecpay_trade_no?: string | null
          id?: string
          merchant_trade_no: string
          note?: string | null
          paid_at?: string | null
          payment_method: string
          refunded_at?: string | null
          status?: string
          waived_by?: string | null
          waived_by_at?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string
          applied_checkout_id?: string | null
          covered_appointment_ids?: string[]
          created_at?: string
          ecpay_trade_no?: string | null
          id?: string
          merchant_trade_no?: string
          note?: string | null
          paid_at?: string | null
          payment_method?: string
          refunded_at?: string | null
          status?: string
          waived_by?: string | null
          waived_by_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deposit_records_applied_checkout_id_fkey"
            columns: ["applied_checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_records_waived_by_fkey"
            columns: ["waived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          holiday_date: string
          is_closed: boolean
          reason: string | null
        }
        Insert: {
          holiday_date: string
          is_closed?: boolean
          reason?: string | null
        }
        Update: {
          holiday_date?: string
          is_closed?: boolean
          reason?: string | null
        }
        Relationships: []
      }
      loyalty_points_accounts: {
        Row: {
          balance: number
          customer_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          customer_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          customer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points_transactions: {
        Row: {
          account_customer_id: string
          created_at: string
          delta: number
          id: string
          operator_id: string | null
          reason: string
          related_checkout_id: string | null
        }
        Insert: {
          account_customer_id: string
          created_at?: string
          delta: number
          id?: string
          operator_id?: string | null
          reason: string
          related_checkout_id?: string | null
        }
        Update: {
          account_customer_id?: string
          created_at?: string
          delta?: number
          id?: string
          operator_id?: string | null
          reason?: string
          related_checkout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_transactions_account_customer_id_fkey"
            columns: ["account_customer_id"]
            isOneToOne: false
            referencedRelation: "loyalty_points_accounts"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "loyalty_points_transactions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_points_transactions_related_checkout_id_fkey"
            columns: ["related_checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
        ]
      }
      member_notes: {
        Row: {
          author_id: string | null
          created_at: string
          customer_id: string
          id: string
          note: string
          photo_urls: string[]
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          note: string
          photo_urls?: string[]
        }
        Update: {
          author_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          note?: string
          photo_urls?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "member_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          channel: string
          content_snapshot: string
          customer_id: string
          id: string
          line_message_id: string | null
          scheduled_notification_id: string | null
          sent_at: string
          status: string
        }
        Insert: {
          channel: string
          content_snapshot: string
          customer_id: string
          id?: string
          line_message_id?: string | null
          scheduled_notification_id?: string | null
          sent_at?: string
          status: string
        }
        Update: {
          channel?: string
          content_snapshot?: string
          customer_id?: string
          id?: string
          line_message_id?: string | null
          scheduled_notification_id?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_scheduled_notification_id_fkey"
            columns: ["scheduled_notification_id"]
            isOneToOne: false
            referencedRelation: "scheduled_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          line_user_id: string | null
          phone: string | null
          role: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          line_user_id?: string | null
          phone?: string | null
          role: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          line_user_id?: string | null
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      referral_records: {
        Row: {
          created_at: string
          id: string
          match_status: string
          matched_at: string | null
          matched_by: string | null
          referred_customer_id: string
          referrer_customer_id: string | null
          referrer_input_raw: string | null
          reward_amount: number | null
          reward_issued_at: string | null
          reward_status: string
          reward_type: string | null
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_status?: string
          matched_at?: string | null
          matched_by?: string | null
          referred_customer_id: string
          referrer_customer_id?: string | null
          referrer_input_raw?: string | null
          reward_amount?: number | null
          reward_issued_at?: string | null
          reward_status?: string
          reward_type?: string | null
          source: string
        }
        Update: {
          created_at?: string
          id?: string
          match_status?: string
          matched_at?: string | null
          matched_by?: string | null
          referred_customer_id?: string
          referrer_customer_id?: string | null
          referrer_input_raw?: string | null
          reward_amount?: number | null
          reward_issued_at?: string | null
          reward_status?: string
          reward_type?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_records_matched_by_fkey"
            columns: ["matched_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_records_referred_customer_id_fkey"
            columns: ["referred_customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_records_referrer_customer_id_fkey"
            columns: ["referrer_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_rules: {
        Row: {
          channel: string
          created_at: string
          id: string
          is_active: boolean
          message_template: string
          name: string
          offset_days: number
          offset_hours: number
          trigger_type: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          is_active?: boolean
          message_template: string
          name: string
          offset_days: number
          offset_hours?: number
          trigger_type: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          message_template?: string
          name?: string
          offset_days?: number
          offset_hours?: number
          trigger_type?: string
        }
        Relationships: []
      }
      revenue_records: {
        Row: {
          amount: number
          customer_id: string | null
          id: string
          note: string | null
          recorded_at: string
          recorded_by: string | null
          revenue_type: string
          source_id: string
          source_table: string
        }
        Insert: {
          amount: number
          customer_id?: string | null
          id?: string
          note?: string | null
          recorded_at?: string
          recorded_by?: string | null
          revenue_type: string
          source_id: string
          source_table: string
        }
        Update: {
          amount?: number
          customer_id?: string | null
          id?: string
          note?: string | null
          recorded_at?: string
          recorded_by?: string | null
          revenue_type?: string
          source_id?: string
          source_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      scheduled_notifications: {
        Row: {
          appointment_id: string | null
          channel: string
          created_at: string
          customer_id: string
          error_message: string | null
          id: string
          rule_id: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
        }
        Insert: {
          appointment_id?: string | null
          channel: string
          created_at?: string
          customer_id: string
          error_message?: string | null
          id?: string
          rule_id?: string | null
          scheduled_at: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string | null
          channel?: string
          created_at?: string
          customer_id?: string
          error_message?: string | null
          id?: string
          rule_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_notifications_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "reminder_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      service_variants: {
        Row: {
          created_at: string
          duration_minutes: number
          face_value_price: number
          id: string
          is_active: boolean
          name: string
          service_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          face_value_price: number
          id?: string
          is_active?: boolean
          name: string
          service_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          face_value_price?: number
          id?: string
          is_active?: boolean
          name?: string
          service_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_variants_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string | null
          compliance_reviewed: boolean
          created_at: string
          default_commission_rate: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          compliance_reviewed?: boolean
          created_at?: string
          default_commission_rate?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          compliance_reviewed?: boolean
          created_at?: string
          default_commission_rate?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          default_commission_rate: number
          hire_date: string | null
          id: string
          name: string
          phone: string | null
          profile_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_commission_rate: number
          hire_date?: string | null
          id?: string
          name: string
          phone?: string | null
          profile_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_commission_rate?: number
          hire_date?: string | null
          id?: string
          name?: string
          phone?: string | null
          profile_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_recurring_availability: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          staff_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean
          staff_id: string
          start_time: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          staff_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_recurring_availability_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_schedules: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          is_day_off: boolean
          note: string | null
          staff_id: string
          start_time: string | null
          work_date: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_day_off?: boolean
          note?: string | null
          staff_id: string
          start_time?: string | null
          work_date: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_day_off?: boolean
          note?: string | null
          staff_id?: string
          start_time?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedules_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_service_skills: {
        Row: {
          can_perform: boolean
          commission_rate_override: number | null
          service_id: string
          staff_id: string
        }
        Insert: {
          can_perform?: boolean
          commission_rate_override?: number | null
          service_id: string
          staff_id: string
        }
        Update: {
          can_perform?: boolean
          commission_rate_override?: number | null
          service_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_service_skills_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_service_skills_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      stored_value_accounts: {
        Row: {
          bonus_balance: number
          customer_id: string
          principal_balance: number
          updated_at: string
        }
        Insert: {
          bonus_balance?: number
          customer_id: string
          principal_balance?: number
          updated_at?: string
        }
        Update: {
          bonus_balance?: number
          customer_id?: string
          principal_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stored_value_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      stored_value_plans: {
        Row: {
          bonus_amount: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          principal_amount: number
          sort_order: number
          tier: string
        }
        Insert: {
          bonus_amount?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          principal_amount: number
          sort_order?: number
          tier: string
        }
        Update: {
          bonus_amount?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          principal_amount?: number
          sort_order?: number
          tier?: string
        }
        Relationships: []
      }
      stored_value_topup_orders: {
        Row: {
          bonus_amount: number
          created_at: string
          customer_id: string
          ecpay_trade_no: string | null
          id: string
          paid_at: string | null
          payment_method: string
          plan_id: string | null
          principal_amount: number
          status: string
        }
        Insert: {
          bonus_amount: number
          created_at?: string
          customer_id: string
          ecpay_trade_no?: string | null
          id?: string
          paid_at?: string | null
          payment_method: string
          plan_id?: string | null
          principal_amount: number
          status?: string
        }
        Update: {
          bonus_amount?: number
          created_at?: string
          customer_id?: string
          ecpay_trade_no?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string
          plan_id?: string | null
          principal_amount?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stored_value_topup_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stored_value_topup_orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "stored_value_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      stored_value_transactions: {
        Row: {
          account_customer_id: string
          bonus_delta: number
          created_at: string
          id: string
          note: string | null
          operator_id: string | null
          principal_delta: number
          related_checkout_id: string | null
          related_topup_order_id: string | null
          type: string
        }
        Insert: {
          account_customer_id: string
          bonus_delta?: number
          created_at?: string
          id?: string
          note?: string | null
          operator_id?: string | null
          principal_delta?: number
          related_checkout_id?: string | null
          related_topup_order_id?: string | null
          type: string
        }
        Update: {
          account_customer_id?: string
          bonus_delta?: number
          created_at?: string
          id?: string
          note?: string | null
          operator_id?: string | null
          principal_delta?: number
          related_checkout_id?: string | null
          related_topup_order_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stored_value_transactions_account_customer_id_fkey"
            columns: ["account_customer_id"]
            isOneToOne: false
            referencedRelation: "stored_value_accounts"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "stored_value_transactions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stored_value_transactions_related_checkout_id_fkey"
            columns: ["related_checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stored_value_transactions_related_topup_order_id_fkey"
            columns: ["related_topup_order_id"]
            isOneToOne: false
            referencedRelation: "stored_value_topup_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
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
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
