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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      code_submissions: {
        Row: {
          code: string
          created_at: string
          execution_time_ms: number | null
          id: string
          language: string
          passed_count: number | null
          problem_id: string
          result_details: Json | null
          score: number | null
          status: string
          total_count: number | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          execution_time_ms?: number | null
          id?: string
          language: string
          passed_count?: number | null
          problem_id: string
          result_details?: Json | null
          score?: number | null
          status?: string
          total_count?: number | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          execution_time_ms?: number | null
          id?: string
          language?: string
          passed_count?: number | null
          problem_id?: string
          result_details?: Json | null
          score?: number | null
          status?: string
          total_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_submissions_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "coding_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_problems: {
        Row: {
          constraints: string | null
          created_at: string
          created_by: string | null
          description: string
          difficulty: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          constraints?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          difficulty?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          constraints?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          difficulty?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      exam_attempts: {
        Row: {
          answers: Json | null
          created_at: string
          credibility_score: number | null
          ended_at: string | null
          exam_id: string
          id: string
          recording_url: string | null
          risk_level: string | null
          score: number | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          credibility_score?: number | null
          ended_at?: string | null
          exam_id: string
          id?: string
          recording_url?: string | null
          risk_level?: string | null
          score?: number | null
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          created_at?: string
          credibility_score?: number | null
          ended_at?: string | null
          exam_id?: string
          id?: string
          recording_url?: string | null
          risk_level?: string | null
          score?: number | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          title: string
          total_questions: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          title: string
          total_questions?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          title?: string
          total_questions?: number
          updated_at?: string
        }
        Relationships: []
      }
      proctoring_snapshots: {
        Row: {
          anomaly_detected: boolean
          attempt_id: string
          created_at: string
          face_count: number
          id: string
          image_data: string
          is_centered: boolean
        }
        Insert: {
          anomaly_detected?: boolean
          attempt_id: string
          created_at?: string
          face_count?: number
          id?: string
          image_data: string
          is_centered?: boolean
        }
        Update: {
          anomaly_detected?: boolean
          attempt_id?: string
          created_at?: string
          face_count?: number
          id?: string
          image_data?: string
          is_centered?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "proctoring_snapshots_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_option: number
          created_at: string
          exam_id: string
          id: string
          options: Json
          order_index: number
          question_text: string
        }
        Insert: {
          correct_option?: number
          created_at?: string
          exam_id: string
          id?: string
          options?: Json
          order_index?: number
          question_text: string
        }
        Update: {
          correct_option?: number
          created_at?: string
          exam_id?: string
          id?: string
          options?: Json
          order_index?: number
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      test_cases: {
        Row: {
          created_at: string
          expected_output: string
          id: string
          input: string
          is_hidden: boolean
          order_index: number
          problem_id: string
        }
        Insert: {
          created_at?: string
          expected_output: string
          id?: string
          input: string
          is_hidden?: boolean
          order_index?: number
          problem_id: string
        }
        Update: {
          created_at?: string
          expected_output?: string
          id?: string
          input?: string
          is_hidden?: boolean
          order_index?: number
          problem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_cases_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "coding_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      violations: {
        Row: {
          attempt_id: string
          created_at: string
          details: string | null
          id: string
          severity: string
          type: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          details?: string | null
          id?: string
          severity?: string
          type: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          details?: string | null
          id?: string
          severity?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "violations_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
