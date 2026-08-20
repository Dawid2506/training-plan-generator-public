import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { savedActivityService } from '../services/saved-activity.service';
import { prisma } from '../prisma/client';

vi.mock('../prisma/client');

const mockUserId = 'test-user-123';
const mockActivityPayload = {
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

describe('SavedActivityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveActivity', () => {
    it('should save a new activity successfully', async () => {
      const mockSaved = {
        id: 'saved-1',
        userId: mockUserId,
        activityId: BigInt(mockActivityPayload.id),
        activityPayload: mockActivityPayload,
        savedAt: new Date(),
      };

      (prisma.savedActivity.findUnique as any).mockResolvedValue(null);
      (prisma.savedActivity.create as any).mockResolvedValue(mockSaved);

      const result = await savedActivityService.saveActivity(mockUserId, mockActivityPayload);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(result.data.activityId).toBe(mockActivityPayload.id);
      expect(prisma.savedActivity.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          activityId: BigInt(mockActivityPayload.id),
          activityPayload: mockActivityPayload,
        },
      });
    });

    it('should return 409 if activity already saved', async () => {
      const mockExisting = {
        id: 'existing-1',
        userId: mockUserId,
        activityId: BigInt(mockActivityPayload.id),
        activityPayload: mockActivityPayload,
        savedAt: new Date(),
      };

      (prisma.savedActivity.findUnique as any).mockResolvedValue(mockExisting);

      const result = await savedActivityService.saveActivity(mockUserId, mockActivityPayload);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(409);
      expect(result.data.id).toBe('existing-1');
      expect(prisma.savedActivity.create).not.toHaveBeenCalled();
    });
  });

  describe('getSavedActivities', () => {
    it('should return all saved activities for user sorted by date desc', async () => {
      const mockActivities = [
        {
          id: 'saved-1',
          userId: mockUserId,
          activityId: BigInt(123),
          activityPayload: mockActivityPayload,
          savedAt: new Date('2026-04-18T10:00:00Z'),
        },
        {
          id: 'saved-2',
          userId: mockUserId,
          activityId: BigInt(456),
          activityPayload: mockActivityPayload,
          savedAt: new Date('2026-04-17T10:00:00Z'),
        },
      ];

      (prisma.savedActivity.findMany as any).mockResolvedValue(mockActivities);

      const result = await savedActivityService.getSavedActivities(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].activityId).toBe(123);
      expect(result[1].activityId).toBe(456);
      expect(prisma.savedActivity.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { savedAt: 'desc' },
      });
    });

    it('should return empty list if user has no saved activities', async () => {
      (prisma.savedActivity.findMany as any).mockResolvedValue([]);

      const result = await savedActivityService.getSavedActivities(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('deleteActivity', () => {
    it('should delete activity and return success', async () => {
      (prisma.savedActivity.deleteMany as any).mockResolvedValue({ count: 1 });

      const result = await savedActivityService.deleteActivity(mockUserId, 12345);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(204);
      expect(prisma.savedActivity.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          activityId: BigInt(12345),
        },
      });
    });

    it('should return 404 if activity not found', async () => {
      (prisma.savedActivity.deleteMany as any).mockResolvedValue({ count: 0 });

      const result = await savedActivityService.deleteActivity(mockUserId, 99999);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
    });
  });
});
