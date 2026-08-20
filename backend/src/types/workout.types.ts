
export interface IntervalPlan {
  workout_header: WorkoutHeader;
  warmup: Warmup;
  main_set: MainSet;
  cooldown: Cooldown;
  coach_notes: CoachNotes;
}

export interface WorkoutHeader {
  title: string;
  sport: "Run" | "Ride";
  category: "Base" | "Threshold" | "VO2Max" | "Recovery";
  difficulty_score: number;
  estimated_total_duration_min: number;
}

export interface Warmup {
  duration_min: number;
  target_hr: string;
  target_pace_or_speed: string;
  instruction: string;
}

export interface MainSet {
  repeats: number;
  work_duration_sec: number;
  work_distance_meters: number;
  work_target_hr: string;
  work_target_pace_or_speed: string;
  recovery_duration_sec: number;
  recovery_distance_meters: number;
  recovery_target_hr: string;
  recovery_type: "Walk" | "Light Jog" | "Easy Spin";
}

export interface Cooldown {
  duration_min: number;
  target_hr: string;
  target_pace_or_speed: string;
  instruction: string;
}

export interface CoachNotes {
  insight: string;
  safety_warning: string;
}

export type WorkoutFocus = "Base" | "Threshold" | "VO2Max" | "Recovery" | "Adaptive";