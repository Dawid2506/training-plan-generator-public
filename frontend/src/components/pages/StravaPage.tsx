import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon, PlusIcon, RefreshCwIcon, ZapIcon } from "lucide-react";
import { SiStrava } from "react-icons/si";

import { ActivityCard } from "@/components/activities/ActivityCard";
import CreatePlanDialog, {
  type CreatePlanFormValues,
  type PlanActivityOption,
  trainingTypeApiMap,
} from "@/components/plans/CreatePlanDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { API_CONFIG, buildApiUrl } from "@/lib/api";
import { useNotifications } from "@/lib/notify";
import {
  normalizeActivitiesPayload,
  normalizeSavedActivitiesPayload,
} from "@/lib/stravaActivityParser";
import { cn } from "@/lib/utils";
import type { StravaActivity, StravaStatus } from "@/types/strava";

export default function StravaPage() {
  const { notify } = useNotifications();
  const [stravaStatus, setStravaStatus] = useState<StravaStatus | null>(null);
  const [allActivities, setAllActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [savingActivityIds, setSavingActivityIds] = useState<Set<number>>(new Set());
  const [savedActivityIds, setSavedActivityIds] = useState<Set<number>>(new Set());

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

  const checkStravaStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.strava.status), {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to check Strava status");
      }

      setStravaStatus((await response.json()) as StravaStatus);
    } catch (error) {
      console.error("Error checking Strava status:", error);
      setStravaStatus({ authorized: false, message: "Error checking status" });
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllActivities = useCallback(async () => {
    try {
      setActivitiesLoading(true);
      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.strava.activities({ per_page: 10 })),
        { credentials: "include" },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No authorization. You need to connect to Strava");
        }
        throw new Error("Failed to fetch activities");
      }

      setAllActivities(normalizeActivitiesPayload(await response.json()));
    } catch (error) {
      console.error("Error fetching activities list:", error);
      notify("Error while fetching activities list.", "Error");
    } finally {
      setActivitiesLoading(false);
    }
  }, [notify]);

  const getSavedActivities = useCallback(async () => {
    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.strava.savedActivities),
        { credentials: "include" },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch saved activities");
      }

      const normalized = normalizeSavedActivitiesPayload(await response.json());
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
  }, []);

  useEffect(() => {
    void checkStravaStatus();
  }, [checkStravaStatus]);

  useEffect(() => {
    if (stravaStatus?.authorized) {
      void getAllActivities();
      void getSavedActivities();
    }
  }, [getAllActivities, getSavedActivities, stravaStatus?.authorized]);

  const connectToStrava = () => {
    window.location.href = `${API_CONFIG.baseURL}/api/strava/authorize`;
  };

  const saveActivity = async (activity: StravaActivity) => {
    if (!activity.id || savedActivityIds.has(activity.id)) return;

    try {
      setSavingActivityIds((current) => new Set(current).add(activity.id));

      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.strava.saveActivity),
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
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
      notify("Activity saved.", "Success");
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

        response = await fetch(
          buildApiUrl(
            API_CONFIG.endpoints.strava.detailedCertainActivities(workoutFocus),
          ),
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activityIds: normalizedActivityIds }),
          },
        );
      } else {
        const activityCount = values.lastActivitiesCount;
        if (
          typeof activityCount !== "number" ||
          activityCount < 1 ||
          activityCount > 20
        ) {
          throw new Error("Use a value from 1 to 20 for last activities.");
        }

        response = await fetch(
          buildApiUrl(
            API_CONFIG.endpoints.strava.detailedActivities(
              workoutFocus,
              values.activityType,
              activityCount,
            ),
          ),
          { credentials: "include" },
        );
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No authorization. You need to connect to Strava");
        }
        throw new Error("Failed to create interval plan");
      }

      notify("Interval plan created. Open Plans to read it.", "Success");
      setIsCreatePlanOpen(false);
    } catch (error) {
      console.error("Error creating interval plan:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      notify(`Cannot create interval plan: ${message}`, "Error");
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const isConnected = Boolean(stravaStatus?.authorized);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Strava"
        description="Pull your latest rides and runs, save the ones worth keeping, and turn them into interval plans."
        actions={
          isConnected ? (
            <>
              <Button variant="ghost" onClick={checkStravaStatus} disabled={loading}>
                <RefreshCwIcon className={cn(loading && "animate-spin")} />
                Refresh
              </Button>
              <Button
                variant="primary"
                onClick={() => setIsCreatePlanOpen(true)}
                disabled={isCreatingPlan || planActivityOptions.length === 0}
              >
                <PlusIcon />
                {isCreatingPlan ? "Creating…" : "Create plan"}
              </Button>
            </>
          ) : undefined
        }
      />

      {/* Connection */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl border",
                isConnected
                  ? "border-[#fc4c02]/25 bg-[#fc4c02]/12 text-[#fc4c02]"
                  : "border-border bg-surface-muted text-muted-foreground",
              )}
            >
              <SiStrava className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 rounded-full",
                    stravaStatus === null
                      ? "bg-muted-foreground"
                      : isConnected
                        ? "bg-success"
                        : "bg-destructive",
                  )}
                />
                <p className="text-[14px] font-medium">
                  {stravaStatus === null
                    ? "Checking connection…"
                    : isConnected
                      ? "Connected to Strava"
                      : "Not connected to Strava"}
                </p>
              </div>
              <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                {stravaStatus?.message ?? "Contacting Strava…"}
              </p>
            </div>
          </div>

          {!isConnected && (
            <Button variant="primary" onClick={connectToStrava} disabled={loading}>
              <SiStrava className="size-4" />
              Connect Strava
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Recent activities */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
            Recent activities
          </h2>
          {isConnected && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/plans">
                View plans
                <ArrowRightIcon />
              </Link>
            </Button>
          )}
        </div>

        {!isConnected ? (
          <Card>
            <EmptyState
              icon={<SiStrava />}
              title="Connect Strava to see your activities"
              description="Once connected, your ten most recent sessions appear here and can be saved or turned into plans."
              action={
                <Button variant="primary" onClick={connectToStrava}>
                  Connect Strava
                </Button>
              }
            />
          </Card>
        ) : activitiesLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-[9.5rem] w-full rounded-xl" />
            ))}
          </div>
        ) : allActivities.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ZapIcon />}
              title="No activities found"
              description="Strava returned no recent sessions for this account."
            />
          </Card>
        ) : (
          <div className="space-y-4">
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
      </section>

      <CreatePlanDialog
        open={isCreatePlanOpen}
        onOpenChange={setIsCreatePlanOpen}
        activities={planActivityOptions}
        isSubmitting={isCreatingPlan}
        onSubmit={createIntervalPlan}
      />
    </div>
  );
}
