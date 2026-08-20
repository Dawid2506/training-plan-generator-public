// Validation schemas for Saved Activities
import { z } from 'zod';

export const StravaActivityPayloadSchema = z.object({
  id: z.number().int().positive('Activity ID must be a positive number'),
  name: z.string().min(1, 'Activity name is required'),
  type: z.string().min(1, 'Activity type is required'),
  distance: z.number().min(0, 'Distance must be non-negative'),
  moving_time: z.number().int().min(0, 'Moving time must be non-negative'),
  elapsed_time: z.number().int().min(0, 'Elapsed time must be non-negative'),
  total_elevation_gain: z.number().min(0, 'Elevation gain must be non-negative'),
  average_speed: z.number().min(0, 'Average speed must be non-negative'),
  max_speed: z.number().min(0, 'Max speed must be non-negative'),
  average_heartrate: z.number().min(0).optional(),
  max_heartrate: z.number().min(0).optional(),
  start_date: z.string().datetime('Invalid date format'),
});

export const SaveActivityRequestSchema = z.object({
  activityId: z.number().int().positive('Activity ID must be a positive number'),
});

export type ValidatedSaveRequest = z.infer<typeof SaveActivityRequestSchema>;
