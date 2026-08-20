// Shared token store for Strava access tokens
// In production, this should be stored in Redis or database with user
export const tokenStore: { [userId: string]: { accessToken: string; refreshToken: string; expiresAt: number } } = {};
