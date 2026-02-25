export interface Triggers {
  milk_tea: boolean;
  coffee: boolean;
  spicy: boolean;
  late_meal: boolean;
  alcohol: boolean;
}

export interface Meds {
  omeprazole_mg: number;
  famotidine_mg: number;
  vonoprazan_mg: number;
}

export interface Workout {
  type: string;
  minutes: number;
  rpe: number;
}

export interface DailyLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  sleep_start: string | null; // HH:MM
  sleep_end: string | null; // HH:MM
  sleep_hours: number | null;
  stress: number; // 0-10
  reflux: number; // 0-10
  breathless: number; // 0-10
  triggers: Triggers;
  meds: Meds;
  workout: Workout;
  weight_kg: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AiInsight {
  id: string;
  user_id: string;
  date: string;
  input_summary: Record<string, unknown>;
  output_text: string;
  output_structured: StructuredInsight | null;
  tags: string[];
  created_at: string;
}

export interface StructuredInsight {
  today_focus: string;
  micro_actions: string[];
  risk_flags: string[];
  weekly_pattern?: string;
  experiment: string;
}

export const DEFAULT_TRIGGERS: Triggers = {
  milk_tea: false,
  coffee: false,
  spicy: false,
  late_meal: false,
  alcohol: false,
};

export const DEFAULT_MEDS: Meds = {
  omeprazole_mg: 0,
  famotidine_mg: 20,
  vonoprazan_mg: 20,
};

export const DEFAULT_WORKOUT: Workout = {
  type: "",
  minutes: 0,
  rpe: 0,
};

export interface DailyTip {
  id: string;
  user_id: string;
  date: string;
  tip_text: string;
  tip_title: string;
  tip_category: string;
  created_at: string;
}

export type DailyLogInsert = Omit<DailyLog, "id" | "created_at" | "updated_at">;
