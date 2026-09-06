import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { API_CONFIG, buildApiUrl } from "@/lib/api";
import { StravaActivity, StravaStatus } from "@/types/strava";
import ActivityCard from "./content/ActivityCard";
import CreatePlanDialog, {
  CreatePlanFormValues,
  PlanActivityOption,
  trainingTypeApiMap,
} from "./content/CreatePlanDialog";
import IntervalPlansTable from "./content/IntervalPlansTable";
import { useNotifications } from "../common/NotificationsProvider";
import {
  normalizeActivitiesPayload,
  normalizeSavedActivitiesPayload,
} from "@/lib/stravaActivityParser";

const StravaPage = () => {
  const { notify } = useNotifications();
  const [stravaStatus, setStravaStatus] = useState<StravaStatus | null>(null);
  const [allActivities, setAllActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [savingActivityIds, setSavingActivityIds] = useState<Set<number>>(
    new Set(),
  );
  const [savedActivityIds, setSavedActivityIds] = useState<Set<number>>(
    new Set(),
  );
  const [plansRefreshKey, setPlansRefreshKey] = useState(0);

  const planActivityOptions = useMemo<PlanActivityOption[]>(
    () =>
      allActivities.map((activity) => ({
        id: String(activity.id),
        name: activity.name,
        type: activity.type,
        start_date: activity.start_date,
      })),
    [allActivities],
  );

  useEffect(() => {
    checkStravaStatus();
  }, []);

  useEffect(() => {
    if (stravaStatus?.authorized) {
      void getAllActivities();
      void getSavedActivities();
    }
  }, [stravaStatus?.authorized]);

  const checkStravaStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.strava.status),
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to check Strava status");
      }

      const status: StravaStatus = await response.json();
      setStravaStatus(status);
      console.log("Strava status:", status);
    } catch (error) {
      console.error("Error checking Strava status:", error);
      setStravaStatus({
        authorized: false,
        message: "Error checking status",
      });
    } finally {
      setLoading(false);
    }
  };

  const connectToStrava = () => {
    window.location.href = `${API_CONFIG.baseURL}/api/strava/authorize`;
  };

  const getDetailedActivity = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.strava.lastDetailedActivity('18145626062')),
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No authorization. You need to connect to Strava");
        }
        throw new Error("Failed to fetch detailed activity");
      }

      const activity = await response.json();
      console.log("Detailed activity:", activity);
    } catch (error) {
      console.error("Error fetching detailed activity:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      notify(`Error while fetching detailed activity: ${message}`, "Error");
    } finally {
      setLoading(false);
    }
  }

  const getAllActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.strava.activities({ per_page: 10 })),
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No authorization. You need to connect to Strava");
        }
        throw new Error("Failed to fetch activities");
      }

      const activities = await response.json();
      setAllActivities(normalizeActivitiesPayload(activities));
    } catch (error) {
      console.error("Error fetching activities list:", error);
      notify("Error while fetching activities list.", "Error");
    } finally {
      setLoading(false);
    }
  };

  const getSavedActivities = async () => {
    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.strava.savedActivities),
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch saved activities");
      }

      const payload = await response.json();
      const normalized = normalizeSavedActivitiesPayload(payload);
      setSavedActivityIds(
        new Set(
          normalized
            .map((item) => item.activityId)
            .filter((id): id is number => typeof id === "number"),
        ),
      );
    } catch (error) {
      console.error("Error fetching saved activities:", error);
    }
  };

  const saveActivity = async (activity: StravaActivity) => {
    if (!activity.id || savedActivityIds.has(activity.id)) {
      return;
    }

    try {
      setSavingActivityIds((current) => new Set(current).add(activity.id));

      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.strava.saveActivity),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ activityId: activity.id }),
        },
      );

      if (!response.ok) {
        if (response.status === 409) {
          setSavedActivityIds((current) => new Set(current).add(activity.id));
          notify("Activity is already saved.", "Info");
          return;
        }
        throw new Error("Failed to save activity");
      }

      setSavedActivityIds((current) => new Set(current).add(activity.id));
      notify("Activity saved successfully.", "Success");
    } catch (error) {
      console.error("Error saving activity:", error);
      notify("Cannot save activity right now.", "Error");
    } finally {
      setSavingActivityIds((current) => {
        const next = new Set(current);
        next.delete(activity.id);
        return next;
      });
    }
  };

  const createIntervalPlan = async (values: CreatePlanFormValues) => {
    try {
      setIsCreatingPlan(true);

      const workoutFocus = trainingTypeApiMap[values.trainingType];
      let response: Response;

      if (values.activitySource === "specific") {
        const normalizedActivityIds = values.selectedActivityIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id));

        if (normalizedActivityIds.length === 0) {
          throw new Error("Select at least one activity.");
        }

        const endpoint = API_CONFIG.endpoints.strava.detailedCertainActivities(
          workoutFocus,
        );

        response = await fetch(buildApiUrl(endpoint), {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            activityIds: normalizedActivityIds,
          }),
        });
      } else {
        const activityCount = values.lastActivitiesCount;
        if (
          typeof activityCount !== "number" ||
          activityCount < 1 ||
          activityCount > 20
        ) {
          throw new Error("Use a value from 1 to 20 for last activities.");
        }

        const endpoint = API_CONFIG.endpoints.strava.detailedActivities(
          workoutFocus,
          values.activityType,
          activityCount,
        );

        response = await fetch(buildApiUrl(endpoint), {
          credentials: "include",
        });
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No authorization. You need to connect to Strava");
        }
        throw new Error("Failed to create interval plan");
      }

      notify("Interval plan was created successfully.", "Success");
      setIsCreatePlanOpen(false);
      setPlansRefreshKey((value) => value + 1);
    } catch (error) {
      console.error("Error creating interval plan:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      notify(`Cannot create interval plan: ${message}`, "Error");
    } finally {
      setIsCreatingPlan(false);
    }
  };

  return (
    <div className="h-full w-full p-4 text-black">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Strava Integration</CardTitle>
          <CardDescription>
            {stravaStatus ? stravaStatus.message : "Checking status..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status autoryzacji */}
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                stravaStatus?.authorized ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span>
              {stravaStatus?.authorized
                ? "Connected to Strava"
                : "Not connected to Strava"}
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={checkStravaStatus}
              variant="outline"
              disabled={loading}
            >
              {loading ? "Checking..." : "Refresh status"}
            </Button>
            <Button
              onClick={getDetailedActivity}
              variant="outline"
              disabled={loading}
            >
              {loading ? "Checking..." : "Detailed activity"}
            </Button>

            {!stravaStatus?.authorized && (
              <Button
                onClick={connectToStrava}
                variant="secondary"
                disabled={loading}
              >
                Connect to Strava
              </Button>
            )}

            {stravaStatus?.authorized && (
              <>
                {/* <Button
                  onClick={getLastActivity}
                  variant="secondary"
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Get last activity"}
                </Button>

                <Button
                  onClick={getCertainActivity}
                  variant="secondary"
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Get certain activity"}
                </Button>

                <Button
                  onClick={getAllActivities}
                  variant="outline"
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Get activities list"}
                </Button> */}
              </>
            )}
          </div>
        </CardFooter>
      </Card>

      <div className="flex flex-col gap-6 lg:flex-row">
        {allActivities.length > 0 && (
          <div className="space-y-4 w-full lg:w-1/2">
            <h2 className="text-xl font-semibold mb-4 text-white">
              Recent Activities
            </h2>
            {allActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                isSaved={savedActivityIds.has(activity.id)}
                isSaving={savingActivityIds.has(activity.id)}
                onSaveClick={() => saveActivity(activity)}
              />
            ))}
          </div>
        )}

        <div className="space-y-4 w-full lg:w-1/2 lg:pl-6">
          <div className="flex justify-between">
              <h2 className="text-xl font-semibold mb-4 text-white">
                Your Interval Plans
              </h2>
              <Button
                  onClick={() => setIsCreatePlanOpen(true)}
                  variant="secondary"
                  disabled={loading || isCreatingPlan}
                >
                  {isCreatingPlan ? "Creating..." : "Create plan"}
                </Button>
          </div>
          <IntervalPlansTable refreshKey={plansRefreshKey} />
        </div>
      </div>

      <CreatePlanDialog
        open={isCreatePlanOpen}
        onOpenChange={setIsCreatePlanOpen}
        activities={planActivityOptions}
        isSubmitting={isCreatingPlan}
        onSubmit={createIntervalPlan}
      />
    </div>
  );
};

export default StravaPage;
