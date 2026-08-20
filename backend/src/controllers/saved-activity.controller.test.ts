import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { savedActivityController } from '../controllers/saved-activity.controller';
import { savedActivityService } from '../services/saved-activity.service';

vi.mock('../services/saved-activity.service');

describe('SavedActivityController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let responseBody: any;

  beforeEach(() => {
    vi.clearAllMocks();
    responseBody = null;

    mockReq = {
      user: {
        id: 'test-user-123',
      },
      body: {},
      params: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis() as any,
      json: vi.fn((data) => {
        responseBody = data;
        return mockRes;
      }) as any,
      send: vi.fn().mockReturnThis() as any,
    };
  });

  describe('POST /saved-activities', () => {
    it('should save activity and return 201', async () => {
      const activityPayload = {
        id: 12345,
        name: 'Morning Ride',
        type: 'Ride',
        distance: 25000,
        moving_time: 3600,
        elapsed_time: 3900,
        total_elevation_gain: 220,
        average_speed: 6.9,
        max_speed: 13.2,
        average_heartrate: 150,
        max_heartrate: 178,
        start_date: '2026-04-18T08:30:00Z',
      };

      mockReq.body = { activity: activityPayload };

      (savedActivityService.saveActivity as any).mockResolvedValue({
        success: true,
        statusCode: 201,
        data: {
          id: 'saved-1',
          activityId: 12345,
          savedAt: '2026-04-19T10:00:00Z',
          activity: activityPayload,
        },
      });

      await savedActivityController.saveActivity(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.activityId).toBe(12345);
    });

    it('should return 409 on duplicate save', async () => {
      const activityPayload = {
        id: 12345,
        name: 'Morning Ride',
        type: 'Ride',
        distance: 25000,
        moving_time: 3600,
        elapsed_time: 3900,
        total_elevation_gain: 220,
        average_speed: 6.9,
        max_speed: 13.2,
        start_date: '2026-04-18T08:30:00Z',
      };

      mockReq.body = { activity: activityPayload };

      (savedActivityService.saveActivity as any).mockResolvedValue({
        success: true,
        statusCode: 409,
        data: {
          id: 'existing-1',
          activityId: 12345,
          savedAt: '2026-04-18T10:00:00Z',
          activity: activityPayload,
        },
      });

      await savedActivityController.saveActivity(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(responseBody.success).toBe(true);
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.body = { activity: { id: 123 } };

      await savedActivityController.saveActivity(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(responseBody.message).toContain('Unauthorized');
    });

    it('should return 400 on invalid payload', async () => {
      mockReq.body = { activity: { id: 'not-a-number' } }; // Invalid: id must be number

      await savedActivityController.saveActivity(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(responseBody.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /saved-activities', () => {
    it('should list all user activities', async () => {
      const mockActivities = [
        {
          id: 'saved-1',
          activityId: 123,
          savedAt: '2026-04-18T10:00:00Z',
          activity: {
            id: 123,
            name: 'Ride 1',
            type: 'Ride',
            distance: 25000,
            moving_time: 3600,
            elapsed_time: 3900,
            total_elevation_gain: 220,
            average_speed: 6.9,
            max_speed: 13.2,
            start_date: '2026-04-18T08:30:00Z',
          },
        },
      ];

      (savedActivityService.getSavedActivities as any).mockResolvedValue(mockActivities);

      await savedActivityController.listActivities(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(responseBody.data).toHaveLength(1);
      expect(responseBody.data[0].activityId).toBe(123);
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await savedActivityController.listActivities(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('DELETE /saved-activities/:activityId', () => {
    it('should delete activity and return 204', async () => {
      mockReq.params = { activityId: '12345' };

      (savedActivityService.deleteActivity as any).mockResolvedValue({
        success: true,
        statusCode: 204,
      });

      await savedActivityController.deleteActivity(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should return 404 if activity not found', async () => {
      mockReq.params = { activityId: '99999' };

      (savedActivityService.deleteActivity as any).mockResolvedValue({
        success: false,
        statusCode: 404,
      });

      await savedActivityController.deleteActivity(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(responseBody.message).toContain('not found');
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.params = { activityId: '123' };

      await savedActivityController.deleteActivity(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 if activityId is invalid', async () => {
      mockReq.params = { activityId: 'not-a-number' };

      await savedActivityController.deleteActivity(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(responseBody.code).toBe('INVALID_ACTIVITY_ID');
    });

    it('should return 400 if activityId is negative', async () => {
      mockReq.params = { activityId: '-123' };

      await savedActivityController.deleteActivity(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(responseBody.code).toBe('INVALID_ACTIVITY_ID');
    });
  });
});
