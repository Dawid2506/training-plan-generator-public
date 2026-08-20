import axios from 'axios';

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
}

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
}

export class StravaService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.STRAVA_CLIENT_ID || '';
    this.clientSecret = process.env.STRAVA_CLIENT_SECRET || '';
    this.redirectUri = process.env.STRAVA_REDIRECT_URI || 'http://localhost:3000/api/strava/callback';
  }

  generateAuthUrl(userId: string): string {
    const scopes = 'read,activity:read_all';
    const state = Buffer.from(userId).toString('base64');
    return `https://www.strava.com/oauth/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${this.redirectUri}&approval_prompt=force&scope=${scopes}&state=${state}`;
  }

  async exchangeCodeForToken(code: string): Promise<StravaTokenResponse> {
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        grant_type: 'authorization_code'
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to exchange authorization code for a token: ${error}`);
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to refresh the access token: ${error}`);
    }
  }

  async getActivities(accessToken: string, options: {
    per_page?: number;
    page?: number;
    before?: number;
    after?: number;
    type?: string;
    count?: number;
  } = {}): Promise<StravaActivity[]> {
    try {
      if (options.count && options.type) {
        let activities: StravaActivity[] = [];
        let page = options.page || 1;
        
        while (activities.length < options.count) {
          const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            params: {
              per_page: options.per_page || 30,
              page: page,
              before: options.before,
              after: options.after
            }
          });

          if (!response.data.length) break;
          
          const filtered = response.data.filter((a: StravaActivity) => a.type === options.type);
          activities = activities.concat(filtered);
          page++;
        }
        
        return activities.slice(0, options.count);
      }

      const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: {
          per_page: options.per_page || 10,
          page: options.page || 1,
          before: options.before,
          after: options.after
        }
      });

      const activities = response.data;
      return options.type ? activities.filter((a: StravaActivity) => a.type === options.type) : activities;
    } catch (error) {
      throw new Error(`Failed to fetch activities: ${error}`);
    }
  }

  async getLastActivity(accessToken: string): Promise<StravaActivity | null> {
    const activities = await this.getActivities(accessToken, { per_page: 1, page: 1 });
    return activities.length > 0 ? activities[0] : null;
  }

  async getActivityById(accessToken: string, activityId: string): Promise<any> {
    try {
      const response = await axios.get(`https://www.strava.com/api/v3/activities/${activityId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch activity ${activityId}: ${error}`);
    }
  }

  formatActivity(activity: StravaActivity) {
    return {
      id: activity.id,
      name: activity.name,
      type: activity.type,
      distance: `${(activity.distance / 1000).toFixed(2)} km`,
      moving_time: this.formatTime(activity.moving_time),
      elapsed_time: this.formatTime(activity.elapsed_time),
      total_elevation_gain: `${activity.total_elevation_gain} m`,
      start_date: activity.start_date,
      average_speed: `${(activity.average_speed * 3.6).toFixed(2)} km/h`,
      max_speed: `${(activity.max_speed * 3.6).toFixed(2)} km/h`,
      average_heartrate: activity.average_heartrate,
      max_heartrate: activity.max_heartrate,
      calories: activity.calories
    };
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  }

  async getActivityAnalysisData(activityId: string, accessToken: string) {
    const detailedData = await this.getActivityStreams(activityId, accessToken);

    if (!detailedData || !detailedData.streams) {
        throw new Error('No data available');
    }

    return detailedData
  }
  async getActivityStreams(activityId: string, accessToken: string) {
    const [streamsResponse, activityResponse] = await Promise.all([
      axios.get(`https://www.strava.com/api/v3/activities/${activityId}/streams`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: {
          keys: 'time,distance,altitude,velocity_smooth,heartrate,grade_smooth',
          key_by_type: true
        }
      }),
      this.getActivityById(accessToken, activityId)
    ]);

    return {
      streams: this.optimizeStreams(streamsResponse.data),
      activity: {
        id: activityResponse.id,
        name: activityResponse.name,
        type: activityResponse.type,
        distance: activityResponse.distance,
        moving_time: activityResponse.moving_time,
        elapsed_time: activityResponse.elapsed_time,
        total_elevation_gain: activityResponse.total_elevation_gain,
        average_speed: activityResponse.average_speed,
        max_speed: activityResponse.max_speed,
        average_heartrate: activityResponse.average_heartrate,
        max_heartrate: activityResponse.max_heartrate,
        start_date: activityResponse.start_date
      }
    };
  }

  private optimizeStreams(streams: any) {
    if (!streams?.time?.data) return null;

    const sampleIntervalSec = 15;
    const sampledData = this.resampleByTime(streams, sampleIntervalSec);

    return { dataPoints: sampledData, splits: this.generateSplits(sampledData) };
  }

  private resampleByTime(streams: any, intervalSec: number) {
    const timeData = streams.time?.data as number[] | undefined;

    if (!timeData || !timeData.length) return [];

    const sampledData = [];
    const startTime = Number(timeData[0]);
    const endTime = Number(timeData[timeData.length - 1]);

    for (let targetTime = startTime; targetTime <= endTime; targetTime += intervalSec) {
      const distance = this.getInterpolatedValue(streams.distance?.data, timeData, targetTime);
      const velocityMps = this.getInterpolatedValue(streams.velocity_smooth?.data, timeData, targetTime);
      const heartrate = this.getInterpolatedValue(streams.heartrate?.data, timeData, targetTime);
      const grade = this.getInterpolatedValue(streams.grade_smooth?.data, timeData, targetTime);
      const altitude = this.getInterpolatedValue(streams.altitude?.data, timeData, targetTime);

      sampledData.push({
        time: targetTime,
        distance: distance !== undefined ? Number(distance.toFixed(1)) : 0,
        speed: velocityMps !== undefined ? Number((velocityMps * 3.6).toFixed(2)) : 0,
        heartrate: heartrate !== undefined ? Math.round(heartrate) : undefined,
        grade: grade !== undefined ? Number(grade.toFixed(1)) : 0,
        altitude: altitude !== undefined ? Number(altitude.toFixed(1)) : undefined
      });
    }

    return sampledData;
  }

  private getInterpolatedValue(
    values: number[] | undefined,
    times: number[],
    targetTime: number
  ): number | undefined {
    if (!values || !values.length || values.length !== times.length) {
      return undefined;
    }

    if (targetTime <= times[0]) return values[0];
    if (targetTime >= times[times.length - 1]) return values[values.length - 1];

    let rightIndex = 0;
    while (rightIndex < times.length && times[rightIndex] < targetTime) {
      rightIndex++;
    }

    if (times[rightIndex] === targetTime) {
      return values[rightIndex];
    }

    const leftIndex = rightIndex - 1;
    const leftTime = times[leftIndex];
    const rightTime = times[rightIndex];
    const leftValue = values[leftIndex];
    const rightValue = values[rightIndex];

    if (rightTime === leftTime) return leftValue;

    const ratio = (targetTime - leftTime) / (rightTime - leftTime);
    return leftValue + ratio * (rightValue - leftValue);
  }

  private generateSplits(data: any[]) {
    if (!data.length) return [];

    const splits = [];
    let currentKm = 1;
    let kmData = { speeds: [] as number[], heartrates: [] as number[], grades: [] as number[] };
    const startDist = data[0].distance;

    for (const point of data) {
      const km = Math.floor((point.distance - startDist) / 1000) + 1;

      if (km > currentKm && kmData.speeds.length) {
        splits.push({
          km: currentKm,
          avgSpeed: this.average(kmData.speeds),
          avgHeartrate: kmData.heartrates.length ? Math.round(this.average(kmData.heartrates)) : null,
          avgGrade: this.average(kmData.grades),
          maxSpeed: Math.max(...kmData.speeds),
          minSpeed: Math.min(...kmData.speeds)
        });
        currentKm = km;
        kmData = { speeds: [], heartrates: [], grades: [] };
      }

      kmData.speeds.push(point.speed);
      if (point.heartrate) kmData.heartrates.push(point.heartrate);
      kmData.grades.push(point.grade);
    }

    // Add last split
    if (kmData.speeds.length) {
      splits.push({
        km: currentKm,
        avgSpeed: this.average(kmData.speeds),
        avgHeartrate: kmData.heartrates.length ? Math.round(this.average(kmData.heartrates)) : null,
        avgGrade: this.average(kmData.grades),
        maxSpeed: Math.max(...kmData.speeds),
        minSpeed: Math.min(...kmData.speeds)
      });
    }

    return splits;
  }

  private average(arr: number[]): number {
    return Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2));
  }
}
