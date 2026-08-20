// API configuration
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  endpoints: {
    auth: {
      login: "/api/auth/login",
      logout: "/api/auth/logout",
      register: "/api/auth/register",
      me: "/api/auth/me",
    },
    chat: {
      sessions: "/api/chat/sessions",
      latestSession: "/api/chat/sessions/latest",
      messages: (sessionId: string) =>
        `/api/chat/sessions/${sessionId}/messages`,
    },
    tokens: {
      myUsageChart: (days: number) =>
        `/api/user/analytics/my-usage-chart?days=${days}`,
      myUsageChart24h: () =>
        `/api/user/analytics/my-usage-chart-24h`,
    },
    strava: {
      status: "/api/strava/status",
      lastActivity: "/api/strava/last-activity",
      authorize: "/api/strava/authorize",
      savedActivities: "/api/strava/saved-activities",
      saveActivity: "/api/strava/saved-activities",
      saveFromFile: "/api/user/activities/save",
      removeSavedActivity: (activityId: number) => `/api/strava/saved-activities/${activityId}`,
      activities: (params?: { per_page?: number; page?: number; before?: number; after?: number }) => {
        const searchParams = new URLSearchParams();
        if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
        if (params?.page) searchParams.append('page', params.page.toString());
        if (params?.before) searchParams.append('before', params.before.toString());
        if (params?.after) searchParams.append('after', params.after.toString());
        return `/api/strava/activities${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      },
      detailedActivity: (activityId: number) => `/api/strava/activity/details/${activityId}`,
      lastDetailedActivity: (id: string) => `/api/strava/activity/details/${id}`,
      detailedActivities: (workoutFocus: string, activityType: string, activityCount: number) => `/api/strava/last-activities/details/${workoutFocus}/${activityType}/${activityCount}/create-plan`,
      detailedCertainActivities: (workoutFocus: string) => `/api/strava/certain-activities/details/${workoutFocus}/create-plan`,
    },
    user: {
      activities: "/api/user/activities",
    },
    intervalPlans: {
      paginated: (params?: { page?: number; limit?: number }) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.append('page', params.page.toString());
        if (params?.limit) searchParams.append('limit', params.limit.toString());
        return `/api/strava/user-interval-plans${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      },
      details: (planId: string) => `/api/strava/user-interval-plan/${planId}`,
    },
  },
  defaultOptions: {
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  },
};

// Helper function to build full URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.baseURL}${endpoint}`;
};
