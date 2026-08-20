export interface ActivityDataPoint {
  time: number;
  distance: number;
  speed: number;
  heartrate: number;
  grade: number;
  altitude: number;
}

export interface ActivitySplit {
  km: number;
  avgSpeed: number;
  avgHeartrate: number;
  avgGrade: number;
  maxSpeed: number;
  minSpeed: number;
}

export interface ParsedActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate: number;
  max_heartrate: number;
  start_date: string;
}

export interface ActivityAnalysisEntry {
  streams: {
    dataPoints: ActivityDataPoint[];
    splits: ActivitySplit[];
  };
  activity: ParsedActivity;
}

export interface ActivityAnalysisPayload {
  workoutFocus: string;
  analysisData: ActivityAnalysisEntry[];
}
