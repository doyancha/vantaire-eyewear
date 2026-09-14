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
      admin_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          cover_image: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          tagline: string
          updated_at: string
        }
        Insert: {
          cover_image: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          tagline: string
          updated_at?: string
        }
        Update: {
          cover_image?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_collections: {
        Row: {
          collection_id: string
          created_at: string
          position: number
          product_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          position?: number
          product_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_collections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          alt_text: string
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          badge: string | null
          best_seller: boolean
          category: string
          compare_at_price: number | null
          created_at: string
          currency: string
          currency_symbol: string
          description: string
          featured: boolean
          features: string[]
          fit: string
          frame_color: string
          frame_look: string
          frame_shape: string
          gender: string
          id: string
          in_stock: boolean
          is_active: boolean
          legacy_id: string
          lens_color: string
          lens_type: string
          name: string
          new_arrival: boolean
          price: number
          seo_description: string
          seo_title: string
          short_description: string
          short_name: string
          slug: string
          sort_order: number
          style_category: string
          updated_at: string
        }
        Insert: {
          badge?: string | null
          best_seller?: boolean
          category?: string
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          currency_symbol?: string
          description: string
          featured?: boolean
          features?: string[]
          fit: string
          frame_color: string
          frame_look: string
          frame_shape: string
          gender?: string
          id?: string
          in_stock?: boolean
          is_active?: boolean
          legacy_id?: string
          lens_color: string
          lens_type: string
          name: string
          new_arrival?: boolean
          price: number
          seo_description: string
          seo_title: string
          short_description: string
          short_name: string
          slug: string
          sort_order?: number
          style_category: string
          updated_at?: string
        }
        Update: {
          badge?: string | null
          best_seller?: boolean
          category?: string
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          currency_symbol?: string
          description?: string
          featured?: boolean
          features?: string[]
          fit?: string
          frame_color?: string
          frame_look?: string
          frame_shape?: string
          gender?: string
          id?: string
          in_stock?: boolean
          is_active?: boolean
          legacy_id?: string
          lens_color?: string
          lens_type?: string
          name?: string
          new_arrival?: boolean
          price?: number
          seo_description?: string
          seo_title?: string
          short_description?: string
          short_name?: string
          slug?: string
          sort_order?: number
          style_category?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          contact_email: string
          contact_friday_hours: string
          contact_hours: string
          contact_location: string
          contact_phone: string
          contact_service_area: string
          created_at: string
          delivery_advance_payment_note: string
          delivery_cash_on_delivery: boolean
          delivery_currency_code: string
          delivery_currency_symbol: string
          delivery_fee_inside_dhaka: number
          delivery_fee_outside_dhaka: number
          delivery_inside_dhaka_time: string
          delivery_outside_dhaka_time: string
          delivery_packaging: string
          id: number
          social_facebook: string | null
          social_instagram: string | null
          updated_at: string
          whatsapp_default_greeting: string
          whatsapp_display_number: string
          whatsapp_is_demo: boolean
          whatsapp_number: string
        }
        Insert: {
          contact_email?: string
          contact_friday_hours: string
          contact_hours: string
          contact_location?: string
          contact_phone?: string
          contact_service_area?: string
          created_at?: string
          delivery_advance_payment_note: string
          delivery_cash_on_delivery?: boolean
          delivery_currency_code?: string
          delivery_currency_symbol?: string
          delivery_fee_inside_dhaka?: number
          delivery_fee_outside_dhaka?: number
          delivery_inside_dhaka_time?: string
          delivery_outside_dhaka_time?: string
          delivery_packaging: string
          id?: number
          social_facebook?: string | null
          social_instagram?: string | null
          updated_at?: string
          whatsapp_default_greeting: string
          whatsapp_display_number?: string
          whatsapp_is_demo?: boolean
          whatsapp_number?: string
        }
        Update: {
          contact_email?: string
          contact_friday_hours?: string
          contact_hours?: string
          contact_location?: string
          contact_phone?: string
          contact_service_area?: string
          created_at?: string
          delivery_advance_payment_note?: string
          delivery_cash_on_delivery?: boolean
          delivery_currency_code?: string
          delivery_currency_symbol?: string
          delivery_fee_inside_dhaka?: number
          delivery_fee_outside_dhaka?: number
          delivery_inside_dhaka_time?: string
          delivery_outside_dhaka_time?: string
          delivery_packaging?: string
          id?: number
          social_facebook?: string | null
          social_instagram?: string | null
          updated_at?: string
          whatsapp_default_greeting?: string
          whatsapp_display_number?: string
          whatsapp_is_demo?: boolean
          whatsapp_number?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

