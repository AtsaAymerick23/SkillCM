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
      applications: {
        Row: {
          applicant_id: string
          cover_letter: string | null
          created_at: string
          id: string
          opportunity_id: string
          status: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          opportunity_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          opportunity_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          points: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name: string
          points?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          points?: number
        }
        Relationships: []
      }
      certificates: {
        Row: {
          code: string
          course_id: string
          exam_attempt_id: string | null
          id: string
          issued_at: string
          project_submission_id: string | null
          user_id: string
        }
        Insert: {
          code?: string
          course_id: string
          exam_attempt_id?: string | null
          id?: string
          issued_at?: string
          project_submission_id?: string | null
          user_id: string
        }
        Update: {
          code?: string
          course_id?: string
          exam_attempt_id?: string | null
          id?: string
          issued_at?: string
          project_submission_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          category: string
          created_at: string
          description: string | null
          description_fr: string | null
          duration_minutes: number
          id: string
          instructor_id: string | null
          language: string
          level: string
          published: boolean
          slug: string
          thumbnail_url: string | null
          title: string
          title_fr: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          description_fr?: string | null
          duration_minutes?: number
          id?: string
          instructor_id?: string | null
          language?: string
          level?: string
          published?: boolean
          slug: string
          thumbnail_url?: string | null
          title: string
          title_fr?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          description_fr?: string | null
          duration_minutes?: number
          id?: string
          instructor_id?: string | null
          language?: string
          level?: string
          published?: boolean
          slug?: string
          thumbnail_url?: string | null
          title?: string
          title_fr?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          answers: Json
          course_id: string
          exam_id: string
          id: string
          passed: boolean
          score: number
          submitted_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          course_id: string
          exam_id: string
          id?: string
          passed?: boolean
          score?: number
          submitted_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          course_id?: string
          exam_id?: string
          id?: string
          passed?: boolean
          score?: number
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exam_questions: {
        Row: {
          correct_index: number
          created_at: string
          exam_id: string
          id: string
          options: Json
          points: number
          position: number
          question: string
        }
        Insert: {
          correct_index?: number
          created_at?: string
          exam_id: string
          id?: string
          options?: Json
          points?: number
          position?: number
          question: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          exam_id?: string
          id?: string
          options?: Json
          points?: number
          position?: number
          question?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          course_id: string
          created_at: string
          id: string
          passing_score: number
          time_limit_minutes: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          passing_score?: number
          time_limit_minutes?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          passing_score?: number
          time_limit_minutes?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          course_id: string
          id: string
          last_position_seconds: number
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          course_id: string
          id?: string
          last_position_seconds?: number
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          course_id?: string
          id?: string
          last_position_seconds?: number
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          attachment_url: string | null
          content: string | null
          content_fr: string | null
          course_id: string
          created_at: string
          duration_minutes: number
          id: string
          position: number
          title: string
          title_fr: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          attachment_url?: string | null
          content?: string | null
          content_fr?: string | null
          course_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          position?: number
          title: string
          title_fr?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          attachment_url?: string | null
          content?: string | null
          content_fr?: string | null
          course_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          position?: number
          title?: string
          title_fr?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_bookings: {
        Row: {
          cadet_id: string
          created_at: string
          id: string
          mentor_id: string
          note: string | null
          requested_at: string
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cadet_id: string
          created_at?: string
          id?: string
          mentor_id: string
          note?: string | null
          requested_at?: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cadet_id?: string
          created_at?: string
          id?: string
          mentor_id?: string
          note?: string | null
          requested_at?: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          location: string | null
          organization: string
          posted_by: string | null
          status: string
          title: string
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          location?: string | null
          organization: string
          posted_by?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          location?: string | null
          organization?: string
          posted_by?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          cover_letter_recipient: string | null
          created_at: string
          education: Json
          experience: Json
          full_name: string | null
          headline: string | null
          id: string
          key_project_summary: string | null
          links: Json
          phone: string | null
          preferred_language: string
          primary_role: Database["public"]["Enums"]["app_role"]
          skills: string[]
          target_role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_letter_recipient?: string | null
          created_at?: string
          education?: Json
          experience?: Json
          full_name?: string | null
          headline?: string | null
          id: string
          key_project_summary?: string | null
          links?: Json
          phone?: string | null
          preferred_language?: string
          primary_role?: Database["public"]["Enums"]["app_role"]
          skills?: string[]
          target_role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_letter_recipient?: string | null
          created_at?: string
          education?: Json
          experience?: Json
          full_name?: string | null
          headline?: string | null
          id?: string
          key_project_summary?: string | null
          links?: Json
          phone?: string | null
          preferred_language?: string
          primary_role?: Database["public"]["Enums"]["app_role"]
          skills?: string[]
          target_role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_submissions: {
        Row: {
          course_id: string
          created_at: string
          feedback: string | null
          id: string
          notes: string | null
          project_id: string
          reviewer_id: string | null
          status: string
          submission_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          notes?: string | null
          project_id: string
          reviewer_id?: string | null
          status?: string
          submission_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          reviewer_id?: string | null
          status?: string
          submission_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          rubric: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          rubric?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          rubric?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      startup_projects: {
        Row: {
          created_at: string
          id: string
          inputs: Json
          name: string
          output: Json
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inputs?: Json
          name: string
          output?: Json
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inputs?: Json
          name?: string
          output?: Json
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points: {
        Row: {
          current_streak: number
          last_activity_date: string | null
          leaderboard_opt_in: boolean
          longest_streak: number
          points: number
          region: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_activity_date?: string | null
          leaderboard_opt_in?: boolean
          longest_streak?: number
          points?: number
          region?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_activity_date?: string | null
          leaderboard_opt_in?: boolean
          longest_streak?: number
          points?: number
          region?: string | null
          updated_at?: string
          user_id?: string
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
      get_leaderboard: {
        Args: { p_limit?: number; p_region?: string }
        Returns: {
          current_streak: number
          full_name: string
          longest_streak: number
          points: number
          region: string
          user_id: string
        }[]
      }
      get_public_profiles: {
        Args: { user_ids: string[] }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          country: string
          full_name: string
          headline: string
          id: string
          preferred_language: string
          primary_role: Database["public"]["Enums"]["app_role"]
          skills: string[]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_daily_activity: {
        Args: never
        Returns: {
          current_streak: number
          longest_streak: number
          milestone_awarded: string
          points: number
        }[]
      }
      submit_exam: {
        Args: { p_answers: Json; p_exam_id: string }
        Returns: {
          attempt_id: string
          passed: boolean
          score: number
        }[]
      }
    }
    Enums: {
      app_role: "student" | "trainer" | "employer" | "admin" | "mentor"
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
      app_role: ["student", "trainer", "employer", "admin", "mentor"],
    },
  },
} as const
