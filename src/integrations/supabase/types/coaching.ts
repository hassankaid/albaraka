export interface CoachType {
  id: string;
  name: string;
  label: string;
  theme_color: string;
  theme_bg: string | null;
  assigned_coach_id: string | null;
  sub_modes: string[] | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CoachStep {
  id: string;
  coach_type_id: string;
  step_number: number;
  step_id: string;
  label: string;
  title: string;
  objective: string | null;
  tips: string[] | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CoachCriteria {
  id: string;
  step_id: string;
  criteria_text: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoachScriptRef {
  id: string;
  step_id: string;
  sub_mode: string | null;
  script_lines: string[];
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CoachDebriefOption {
  id: string;
  step_id: string;
  debrief_label: string;
  options: string[];
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CoachingSession {
  id: string;
  coach_type_id: string;
  coach_user_id: string;
  student_user_id: string;
  sub_mode: string | null;
  session_number: number;
  session_date: string;
  global_score: number | null;
  status: 'draft' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface CoachingScore {
  id: string;
  session_id: string;
  step_id: string;
  criteria_scores: number[];
  debrief_responses: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoachingSessionWithRelations extends CoachingSession {
  coach_type?: CoachType;
  coach_user?: { id: string; full_name: string };
  student_user?: { id: string; full_name: string };
  scores?: CoachingScore[];
}
