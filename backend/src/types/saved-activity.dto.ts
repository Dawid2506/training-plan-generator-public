// Request/Response DTOs for Saved Activities

export interface StravaActivityPayload {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  start_date: string;
}

export interface StravaAnalysisDataItem {
  streams: unknown;
  activity: StravaActivityPayload;
}

export interface SavedActivityPayload {
  analysisData: StravaAnalysisDataItem[];
}

export interface SaveActivityRequest {
  activityId: number;
}

export interface SavedActivityResponse {
  id: string;
  activityId: number;
  savedAt: string;
  activity: StravaActivityPayload;
  analysisData?: StravaAnalysisDataItem[];
}

export interface SaveActivityApiResponse {
  success: boolean;
  data: SavedActivityResponse;
}

export interface ListSavedActivitiesResponse {
  data: SavedActivityResponse[];
}

export interface DeleteActivityResponse {
  success: boolean;
}

export interface ApiErrorResponse {
  message: string;
  code?: string;
}
