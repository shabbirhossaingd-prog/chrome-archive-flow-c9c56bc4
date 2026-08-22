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
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string
          actor_id: string | null
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: string
          label: string
        }
        Insert: {
          action: string
          actor_email?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: string
          label?: string
        }
        Update: {
          action?: string
          actor_email?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: string
          label?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          content: string
          created_at: string
          excerpt: string
          featured: boolean
          featured_image: string
          id: string
          og_image: string
          published_at: string | null
          seo_description: string
          seo_title: string
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          excerpt?: string
          featured?: boolean
          featured_image?: string
          id?: string
          og_image?: string
          published_at?: string | null
          seo_description?: string
          seo_title?: string
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          excerpt?: string
          featured?: boolean
          featured_image?: string
          id?: string
          og_image?: string
          published_at?: string | null
          seo_description?: string
          seo_title?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          code_prefix: string
          created_at: string
          id: string
          image_url: string | null
          name: string
          og_image: string
          seo_description: string
          seo_title: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          code_prefix?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          og_image?: string
          seo_description?: string
          seo_title?: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code_prefix?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          og_image?: string
          seo_description?: string
          seo_title?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      category_counters: {
        Row: {
          category_slug: string
          last_number: number
          updated_at: string
        }
        Insert: {
          category_slug: string
          last_number?: number
          updated_at?: string
        }
        Update: {
          category_slug?: string
          last_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_counters_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      collections: {
        Row: {
          archived: boolean
          button_href: string
          button_label: string
          campaign_images: string[]
          collection_code: string
          created_at: string
          description: string
          drop_number: number
          editorial_images: string[]
          heading: string
          hero_image: string
          id: string
          is_current: boolean
          label: string
          marquee_text: string
          name: string
          published: boolean
          slug: string
          sort_order: number
          tagline: string
          updated_at: string
          year: string
        }
        Insert: {
          archived?: boolean
          button_href?: string
          button_label?: string
          campaign_images?: string[]
          collection_code?: string
          created_at?: string
          description?: string
          drop_number?: number
          editorial_images?: string[]
          heading?: string
          hero_image?: string
          id?: string
          is_current?: boolean
          label?: string
          marquee_text?: string
          name: string
          published?: boolean
          slug: string
          sort_order?: number
          tagline?: string
          updated_at?: string
          year?: string
        }
        Update: {
          archived?: boolean
          button_href?: string
          button_label?: string
          campaign_images?: string[]
          collection_code?: string
          created_at?: string
          description?: string
          drop_number?: number
          editorial_images?: string[]
          heading?: string
          hero_image?: string
          id?: string
          is_current?: boolean
          label?: string
          marquee_text?: string
          name?: string
          published?: boolean
          slug?: string
          sort_order?: number
          tagline?: string
          updated_at?: string
          year?: string
        }
        Relationships: []
      }
      commerce_bundles: {
        Row: {
          active: boolean
          bundle_price: number
          code: string
          created_at: string
          description: string
          hero_image: string
          id: string
          name: string
          product_ids: string[]
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          bundle_price?: number
          code: string
          created_at?: string
          description?: string
          hero_image?: string
          id?: string
          name: string
          product_ids?: string[]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          bundle_price?: number
          code?: string
          created_at?: string
          description?: string
          hero_image?: string
          id?: string
          name?: string
          product_ids?: string[]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      commerce_notification_events: {
        Row: {
          created_at: string
          delivery_status: string
          email: string
          event_type: string
          id: string
          order_id: string
          order_number: string
          payload: Json
          phone: string
        }
        Insert: {
          created_at?: string
          delivery_status?: string
          email?: string
          event_type: string
          id?: string
          order_id: string
          order_number: string
          payload?: Json
          phone?: string
        }
        Update: {
          created_at?: string
          delivery_status?: string
          email?: string
          event_type?: string
          id?: string
          order_id?: string
          order_number?: string
          payload?: Json
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_notification_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_promos: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          max_uses: number | null
          min_order_amount: number
          starts_at: string | null
          updated_at: string
          usage_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value: number
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_amount?: number
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_amount?: number
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      commerce_shop_looks: {
        Row: {
          created_at: string
          id: string
          image_url: string
          product_ids: string[]
          published: boolean
          sort_order: number
          tagline: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string
          product_ids?: string[]
          published?: boolean
          sort_order?: number
          tagline?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          product_ids?: string[]
          published?: boolean
          sort_order?: number
          tagline?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          created_at: string
          full_address: string
          id: string
          is_default: boolean
          label: string
          map_url: string | null
          phone: string
          recipient_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_address: string
          id?: string
          is_default?: boolean
          label?: string
          map_url?: string | null
          phone?: string
          recipient_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_address?: string
          id?: string
          is_default?: boolean
          label?: string
          map_url?: string | null
          phone?: string
          recipient_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          created_at: string
          display_name: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          phone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      erp_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          expense_date: string
          id: string
          notes: string
          payment_method: string
          recurring_monthly: boolean
          recurring_until: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          notes?: string
          payment_method?: string
          recurring_monthly?: boolean
          recurring_until?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          notes?: string
          payment_method?: string
          recurring_monthly?: boolean
          recurring_until?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      erp_month_closes: {
        Row: {
          closed_at: string
          created_at: string
          id: string
          month: number
          reopened_at: string | null
          snapshot: Json
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          closed_at?: string
          created_at?: string
          id?: string
          month: number
          reopened_at?: string | null
          snapshot?: Json
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          closed_at?: string
          created_at?: string
          id?: string
          month?: number
          reopened_at?: string | null
          snapshot?: Json
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      erp_purchases: {
        Row: {
          average_cost_after: number
          average_cost_before: number
          created_at: string
          id: string
          notes: string
          other_cost: number
          packaging_cost: number
          product_code: string
          product_id: string
          product_name: string
          purchase_date: string
          purchase_number: string
          quantity: number
          received_at: string
          reversed_at: string | null
          status: string
          stock_after: number
          stock_before: number
          supplier_name: string
          supplier_phone: string
          total_cost: number
          transport_cost: number
          unit_cost: number
        }
        Insert: {
          average_cost_after?: number
          average_cost_before?: number
          created_at?: string
          id?: string
          notes?: string
          other_cost?: number
          packaging_cost?: number
          product_code: string
          product_id: string
          product_name: string
          purchase_date?: string
          purchase_number: string
          quantity: number
          received_at?: string
          reversed_at?: string | null
          status?: string
          stock_after: number
          stock_before: number
          supplier_name?: string
          supplier_phone?: string
          total_cost: number
          transport_cost?: number
          unit_cost: number
        }
        Update: {
          average_cost_after?: number
          average_cost_before?: number
          created_at?: string
          id?: string
          notes?: string
          other_cost?: number
          packaging_cost?: number
          product_code?: string
          product_id?: string
          product_name?: string
          purchase_date?: string
          purchase_number?: string
          quantity?: number
          received_at?: string
          reversed_at?: string | null
          status?: string
          stock_after?: number
          stock_before?: number
          supplier_name?: string
          supplier_phone?: string
          total_cost?: number
          transport_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "erp_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_stock_movements: {
        Row: {
          average_cost_after: number
          average_cost_before: number
          created_at: string
          id: string
          movement_type: string
          note: string
          product_code: string
          product_id: string
          product_name: string
          quantity_delta: number
          reference_id: string | null
          stock_after: number
          stock_before: number
        }
        Insert: {
          average_cost_after?: number
          average_cost_before?: number
          created_at?: string
          id?: string
          movement_type?: string
          note?: string
          product_code: string
          product_id: string
          product_name: string
          quantity_delta?: number
          reference_id?: string | null
          stock_after: number
          stock_before: number
        }
        Update: {
          average_cost_after?: number
          average_cost_before?: number
          created_at?: string
          id?: string
          movement_type?: string
          note?: string
          product_code?: string
          product_id?: string
          product_name?: string
          quantity_delta?: number
          reference_id?: string | null
          stock_after?: number
          stock_before?: number
        }
        Relationships: [
          {
            foreignKeyName: "erp_stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_note: string
          cancelled_at: string | null
          color_stock_released: boolean
          confirmed_at: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_note: string | null
          customer_user_id: string | null
          delivered_at: string | null
          delivery_address: string
          discount_amount: number
          erp_cogs_snapshot: number | null
          erp_courier_cost: number | null
          erp_financialized_at: string | null
          erp_other_cost: number
          erp_packaging_cost: number | null
          erp_unit_cost_snapshot: number | null
          id: string
          latitude: number | null
          longitude: number | null
          map_url: string | null
          order_number: string
          paid_at: string | null
          payment_method: string
          payment_status: string
          phone: string
          processing_at: string | null
          product_code: string
          product_id: string | null
          product_name: string
          promo_code: string | null
          quantity: number
          selected_color: string | null
          selected_finish: string | null
          selected_size: string | null
          shipped_at: string | null
          source: string
          status: string
          steadfast_connected_at: string | null
          steadfast_consignment_id: number | null
          steadfast_last_error: string | null
          steadfast_state: string
          steadfast_status: string | null
          steadfast_synced_at: string | null
          steadfast_tracking_code: string | null
          stock_released: boolean
          stock_reserved: boolean
          subtotal_price: number | null
          total_price: number
          transaction_id: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          admin_note?: string
          cancelled_at?: string | null
          color_stock_released?: boolean
          confirmed_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_note?: string | null
          customer_user_id?: string | null
          delivered_at?: string | null
          delivery_address: string
          discount_amount?: number
          erp_cogs_snapshot?: number | null
          erp_courier_cost?: number | null
          erp_financialized_at?: string | null
          erp_other_cost?: number
          erp_packaging_cost?: number | null
          erp_unit_cost_snapshot?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          map_url?: string | null
          order_number: string
          paid_at?: string | null
          payment_method?: string
          payment_status?: string
          phone: string
          processing_at?: string | null
          product_code: string
          product_id?: string | null
          product_name: string
          promo_code?: string | null
          quantity: number
          selected_color?: string | null
          selected_finish?: string | null
          selected_size?: string | null
          shipped_at?: string | null
          source?: string
          status?: string
          steadfast_connected_at?: string | null
          steadfast_consignment_id?: number | null
          steadfast_last_error?: string | null
          steadfast_state?: string
          steadfast_status?: string | null
          steadfast_synced_at?: string | null
          steadfast_tracking_code?: string | null
          stock_released?: boolean
          stock_reserved?: boolean
          subtotal_price?: number | null
          total_price: number
          transaction_id?: string | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          admin_note?: string
          cancelled_at?: string | null
          color_stock_released?: boolean
          confirmed_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_note?: string | null
          customer_user_id?: string | null
          delivered_at?: string | null
          delivery_address?: string
          discount_amount?: number
          erp_cogs_snapshot?: number | null
          erp_courier_cost?: number | null
          erp_financialized_at?: string | null
          erp_other_cost?: number
          erp_packaging_cost?: number | null
          erp_unit_cost_snapshot?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          map_url?: string | null
          order_number?: string
          paid_at?: string | null
          payment_method?: string
          payment_status?: string
          phone?: string
          processing_at?: string | null
          product_code?: string
          product_id?: string | null
          product_name?: string
          promo_code?: string | null
          quantity?: number
          selected_color?: string | null
          selected_finish?: string | null
          selected_size?: string | null
          shipped_at?: string | null
          source?: string
          status?: string
          steadfast_connected_at?: string | null
          steadfast_consignment_id?: number | null
          steadfast_last_error?: string | null
          steadfast_state?: string
          steadfast_status?: string | null
          steadfast_synced_at?: string | null
          steadfast_tracking_code?: string | null
          stock_released?: boolean
          stock_reserved?: boolean
          subtotal_price?: number | null
          total_price?: number
          transaction_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          body: string
          content_json: Json
          created_at: string
          hero_image: string
          id: string
          label: string
          page_key: string
          seo_description: string
          seo_title: string
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          content_json?: Json
          created_at?: string
          hero_image?: string
          id?: string
          label?: string
          page_key: string
          seo_description?: string
          seo_title?: string
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Update: {
          body?: string
          content_json?: Json
          created_at?: string
          hero_image?: string
          id?: string
          label?: string
          page_key?: string
          seo_description?: string
          seo_title?: string
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          archived: boolean
          care: string
          category: string
          collection_id: string | null
          collection_name: string
          color_stock: Json
          colors: string[]
          created_at: string
          delivery: string
          details_content: string
          erp_average_cost: number
          erp_low_stock_threshold: number
          featured: boolean
          finish: string[]
          fit_gender: string
          full_description: string
          gallery_images: string[]
          id: string
          material: string
          material_content: string
          name: string
          new_collection: boolean
          old_price: number | null
          price: number
          primary_image: string
          product_code: string
          published: boolean
          quantity_available: number
          related_product_ids: string[]
          short_description: string
          size_description: string
          size_guide: string
          size_type: string
          sizes: string[]
          slug: string
          sort_order: number
          stock_status: string
          tags: string[]
          updated_at: string
          whatsapp_available: boolean
        }
        Insert: {
          archived?: boolean
          care?: string
          category: string
          collection_id?: string | null
          collection_name?: string
          color_stock?: Json
          colors?: string[]
          created_at?: string
          delivery?: string
          details_content?: string
          erp_average_cost?: number
          erp_low_stock_threshold?: number
          featured?: boolean
          finish?: string[]
          fit_gender?: string
          full_description?: string
          gallery_images?: string[]
          id?: string
          material?: string
          material_content?: string
          name: string
          new_collection?: boolean
          old_price?: number | null
          price?: number
          primary_image?: string
          product_code: string
          published?: boolean
          quantity_available?: number
          related_product_ids?: string[]
          short_description?: string
          size_description?: string
          size_guide?: string
          size_type?: string
          sizes?: string[]
          slug: string
          sort_order?: number
          stock_status?: string
          tags?: string[]
          updated_at?: string
          whatsapp_available?: boolean
        }
        Update: {
          archived?: boolean
          care?: string
          category?: string
          collection_id?: string | null
          collection_name?: string
          color_stock?: Json
          colors?: string[]
          created_at?: string
          delivery?: string
          details_content?: string
          erp_average_cost?: number
          erp_low_stock_threshold?: number
          featured?: boolean
          finish?: string[]
          fit_gender?: string
          full_description?: string
          gallery_images?: string[]
          id?: string
          material?: string
          material_content?: string
          name?: string
          new_collection?: boolean
          old_price?: number | null
          price?: number
          primary_image?: string
          product_code?: string
          published?: boolean
          quantity_available?: number
          related_product_ids?: string[]
          short_description?: string
          size_description?: string
          size_guide?: string
          size_type?: string
          sizes?: string[]
          slug?: string
          sort_order?: number
          stock_status?: string
          tags?: string[]
          updated_at?: string
          whatsapp_available?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "products_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          bkash_enabled: boolean
          bkash_number: string
          brand_name: string
          cod_enabled: boolean
          commerce_email_notifications: boolean
          commerce_sms_notifications: boolean
          commerce_whatsapp_notifications: boolean
          created_at: string
          currency_code: string
          currency_symbol: string
          default_care: string
          default_delivery: string
          default_size_guide: string
          email: string
          erp_auto_month_close: boolean
          erp_default_courier_cost: number
          erp_default_packaging_cost: number
          erp_mobile_payment_fee_percent: number
          id: string
          instagram_url: string
          location: string
          nagad_enabled: boolean
          nagad_number: string
          steadfast_test_mode: boolean
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          bkash_enabled?: boolean
          bkash_number?: string
          brand_name?: string
          cod_enabled?: boolean
          commerce_email_notifications?: boolean
          commerce_sms_notifications?: boolean
          commerce_whatsapp_notifications?: boolean
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          default_care?: string
          default_delivery?: string
          default_size_guide?: string
          email?: string
          erp_auto_month_close?: boolean
          erp_default_courier_cost?: number
          erp_default_packaging_cost?: number
          erp_mobile_payment_fee_percent?: number
          id?: string
          instagram_url?: string
          location?: string
          nagad_enabled?: boolean
          nagad_number?: string
          steadfast_test_mode?: boolean
          updated_at?: string
          whatsapp_number?: string
        }
        Update: {
          bkash_enabled?: boolean
          bkash_number?: string
          brand_name?: string
          cod_enabled?: boolean
          commerce_email_notifications?: boolean
          commerce_sms_notifications?: boolean
          commerce_whatsapp_notifications?: boolean
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          default_care?: string
          default_delivery?: string
          default_size_guide?: string
          email?: string
          erp_auto_month_close?: boolean
          erp_default_courier_cost?: number
          erp_default_packaging_cost?: number
          erp_mobile_payment_fee_percent?: number
          id?: string
          instagram_url?: string
          location?: string
          nagad_enabled?: boolean
          nagad_number?: string
          steadfast_test_mode?: boolean
          updated_at?: string
          whatsapp_number?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_erp_month: {
        Args: { p_month: number; p_year: number }
        Returns: Json
      }
      create_commerce_order: {
        Args: {
          p_address: string
          p_color: string
          p_customer_email: string
          p_customer_name: string
          p_finish: string
          p_latitude: number
          p_longitude: number
          p_map_url: string
          p_note: string
          p_payment_method: string
          p_phone: string
          p_product_id: string
          p_promo_code: string
          p_quantity: number
          p_size: string
          p_transaction_id: string
        }
        Returns: {
          discount_amount: number
          order_number: string
          promo_code: string
          total_price: number
        }[]
      }
      create_erp_purchase: {
        Args: {
          p_notes: string
          p_other_cost: number
          p_packaging_cost: number
          p_product_id: string
          p_purchase_date: string
          p_quantity: number
          p_supplier_name: string
          p_supplier_phone: string
          p_transport_cost: number
          p_unit_cost: number
        }
        Returns: {
          purchase_id: string
          purchase_number: string
        }[]
      }
      create_public_order:
        | {
            Args: {
              p_address: string
              p_customer_name: string
              p_finish: string
              p_latitude: number
              p_longitude: number
              p_map_url: string
              p_note: string
              p_phone: string
              p_product_id: string
              p_quantity: number
              p_size: string
            }
            Returns: {
              order_number: string
              total_price: number
            }[]
          }
        | {
            Args: {
              p_address: string
              p_customer_name: string
              p_finish: string
              p_latitude: number
              p_longitude: number
              p_map_url: string
              p_note: string
              p_payment_method: string
              p_phone: string
              p_product_id: string
              p_quantity: number
              p_size: string
              p_transaction_id: string
            }
            Returns: {
              order_number: string
              total_price: number
            }[]
          }
      erp_adjust_inventory: {
        Args: {
          p_low_stock_threshold: number
          p_new_average_cost: number
          p_new_quantity: number
          p_note: string
          p_product_id: string
        }
        Returns: undefined
      }
      erp_auto_close_previous_month: { Args: never; Returns: Json }
      erp_month_metrics: {
        Args: { p_month: number; p_year: number }
        Returns: Json
      }
      next_product_code: { Args: { _category: string }; Returns: string }
      peek_product_code: { Args: { _category: string }; Returns: string }
      preview_promo_code: {
        Args: { p_code: string; p_subtotal: number }
        Returns: {
          code: string
          discount_amount: number
          final_total: number
          message: string
          valid: boolean
        }[]
      }
      reopen_erp_month: {
        Args: { p_month: number; p_year: number }
        Returns: undefined
      }
      reverse_erp_purchase: {
        Args: { p_purchase_id: string }
        Returns: undefined
      }
      track_public_order: {
        Args: { p_order_number: string; p_phone: string }
        Returns: {
          cancelled_at: string
          confirmed_at: string
          created_at: string
          delivered_at: string
          discount_amount: number
          order_number: string
          payment_method: string
          payment_status: string
          processing_at: string
          product_code: string
          product_name: string
          promo_code: string
          quantity: number
          selected_color: string
          selected_finish: string
          selected_size: string
          shipped_at: string
          status: string
          subtotal_price: number
          total_price: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
