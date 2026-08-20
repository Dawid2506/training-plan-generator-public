export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number | string;
  moving_time: number | string;
  elapsed_time: number | string;
  total_elevation_gain: number | string;
  start_date: string;
  average_speed: number | string;
  max_speed: number | string;
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
}

export interface StravaStatus {
  authorized: boolean;
  message: string;
}

export interface SavedActivity {
  id?: string | number;
  activityId: number | null;
  savedAt?: string;
  sourceType?: "FILE" | "STRAVA";
  sourceFileName?: string;
  format?: "strava" | "fit";
  workoutFocus?: string;
  activity: StravaActivity;
}
