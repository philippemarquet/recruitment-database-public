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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      candidate_actions: {
        Row: {
          action_type: string
          assigned_to: string
          candidate_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          interview_id: string | null
          phase: Database["public"]["Enums"]["recruitment_phase"]
          updated_at: string
        }
        Insert: {
          action_type: string
          assigned_to: string
          candidate_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          interview_id?: string | null
          phase: Database["public"]["Enums"]["recruitment_phase"]
          updated_at?: string
        }
        Update: {
          action_type?: string
          assigned_to?: string
          candidate_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          interview_id?: string | null
          phase?: Database["public"]["Enums"]["recruitment_phase"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_actions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_actions_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_sources: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      candidates: {
        Row: {
          application_date: string | null
          assigned_to: string | null
          created_at: string
          current_phase: Database["public"]["Enums"]["recruitment_phase"]
          cv_url: string | null
          email: string
          final_decision_date: string | null
          first_interview_date: string | null
          first_name: string
          gender: string | null
          general_information: string | null
          id: string
          last_name: string
          linkedin_url: string | null
          notes: string | null
          offer_date: string | null
          phone: string | null
          position_applied: string
          rejected_by: string | null
          rejection_reason_id: string | null
          salary_requirements: string | null
          screening_date: string | null
          second_interview_date: string | null
          seniority_level: string | null
          source: string | null
          third_interview_date: string | null
          updated_at: string
        }
        Insert: {
          application_date?: string | null
          assigned_to?: string | null
          created_at?: string
          current_phase?: Database["public"]["Enums"]["recruitment_phase"]
          cv_url?: string | null
          email: string
          final_decision_date?: string | null
          first_interview_date?: string | null
          first_name: string
          gender?: string | null
          general_information?: string | null
          id?: string
          last_name: string
          linkedin_url?: string | null
          notes?: string | null
          offer_date?: string | null
          phone?: string | null
          position_applied: string
          rejected_by?: string | null
          rejection_reason_id?: string | null
          salary_requirements?: string | null
          screening_date?: string | null
          second_interview_date?: string | null
          seniority_level?: string | null
          source?: string | null
          third_interview_date?: string | null
          updated_at?: string
        }
        Update: {
          application_date?: string | null
          assigned_to?: string | null
          created_at?: string
          current_phase?: Database["public"]["Enums"]["recruitment_phase"]
          cv_url?: string | null
          email?: string
          final_decision_date?: string | null
          first_interview_date?: string | null
          first_name?: string
          gender?: string | null
          general_information?: string | null
          id?: string
          last_name?: string
          linkedin_url?: string | null
          notes?: string | null
          offer_date?: string | null
          phone?: string | null
          position_applied?: string
          rejected_by?: string | null
          rejection_reason_id?: string | null
          salary_requirements?: string | null
          screening_date?: string | null
          second_interview_date?: string | null
          seniority_level?: string | null
          source?: string | null
          third_interview_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_rejection_reason_id_fkey"
            columns: ["rejection_reason_id"]
            isOneToOne: false
            referencedRelation: "rejection_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      genders: {
        Row: {
          active: boolean
          created_at: string
          display_order: number | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      interviews: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          interview_notes: string | null
          interviewer_id: string
          location: Database["public"]["Enums"]["interview_location"] | null
          notes_submitted_at: string | null
          phase: Database["public"]["Enums"]["recruitment_phase"]
          scheduled_by: string
          scheduled_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          interview_notes?: string | null
          interviewer_id: string
          location?: Database["public"]["Enums"]["interview_location"] | null
          notes_submitted_at?: string | null
          phase: Database["public"]["Enums"]["recruitment_phase"]
          scheduled_by: string
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          interview_notes?: string | null
          interviewer_id?: string
          location?: Database["public"]["Enums"]["interview_location"] | null
          notes_submitted_at?: string | null
          phase?: Database["public"]["Enums"]["recruitment_phase"]
          scheduled_by?: string
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_scheduled_by_fkey"
            columns: ["scheduled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          active: boolean
          created_at: string
          display_order: number | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          recruiter_source: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          recruiter_source?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          recruiter_source?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rejection_reasons: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          reason: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          id?: string
          reason: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          reason?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      seniority_levels: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_hr_manager: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_public_profiles: {
        Args: { ids: string[] }
        Returns: {
          avatar_url: string
          first_name: string
          id: string
          last_name: string
          role: string
        }[]
      }
      is_hr_manager: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_manager: {
        Args: { _user_id: string }
        Returns: boolean
      }
      log_security_event: {
        Args: { details?: Json; event_type: string; user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      interview_location: "Kantoor" | "Digitaal" | "Elders"
      recipient_type:
        | "candidate"
        | "action_owner"
        | "hr_manager"
        | "recruiter"
        | "manager"
        | "custom"
      recruitment_phase:
        | "screening"
        | "first_interview"
        | "second_interview"
        | "third_interview"
        | "negotiation"
        | "on_hold"
        | "rejected"
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
      interview_location: ["Kantoor", "Digitaal", "Elders"],
      recipient_type: [
        "candidate",
        "action_owner",
        "hr_manager",
        "recruiter",
        "manager",
        "custom",
      ],
      recruitment_phase: [
        "screening",
        "first_interview",
        "second_interview",
        "third_interview",
        "negotiation",
        "on_hold",
        "rejected",
      ],
    },
  },
} as const
