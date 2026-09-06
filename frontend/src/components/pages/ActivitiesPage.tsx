import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookmarkIcon,
  FileUpIcon,
  PlusIcon,
  RefreshCwIcon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react";

import { ActivityCard } from "@/components/activities/ActivityCard";
import CreatePlanDialog, {
  type CreatePlanFormValues,
  type PlanActivityOption,
  trainingTypeApiMap,
} from "@/components/plans/CreatePlanDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { API_CONFIG, buildApiUrl } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { useNotifications } from "@/lib/notify";
import { normalizeSavedActivitiesPayload } from "@/lib/stravaActivityParser";
import { cn } from "@/lib/utils";
import type { SavedActivity } from "@/types/strava";

export default function ActivitiesPage() {
  const { notify } = useNotifications();
  const [savedActivities, setSavedActivities] = useState<SavedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const [selectedFitFile, setSelectedFitFile] = useState<File | null>(null);
  const [uploadingFitFile, setUploadingFitFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const fitFileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchSavedActivities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.user.activities),
        { credentials: "include" },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No authorization. Please sign in again.");
        }
        throw new Error("Failed to load saved activities");
      }

      setSavedActivities(normalizeSavedActivitiesPayload(await response.json()));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      notify(`Cannot load saved activities: ${message}`, "Error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void fetchSavedActivities();
  }, [fetchSavedActivities]);

  const sortedSavedActivities = useMemo(
    () =>
      [...savedActivities].sort((a, b) => {
        const aTime = a.savedAt ? new Date(a.savedAt).getTime() : 0;
        const bTime = b.savedAt ? new Date(b.savedAt).getTime() : 0;
        return bTime - aTime;
      }),
    [savedActivities],
  );

  const removeSavedActivity = async (savedItem: SavedActivity) => {
    if (savedItem.activityId === null) {
      notify("This activity cannot be removed by activity ID.", "Info");
      return;
    }

    const activityId = savedItem.activityId;

    try {
      setRemovingIds((current) => new Set(current).add(activityId));

      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.strava.removeSavedActivity(activityId)),
        { method: "DELETE", credentials: "include" },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No authorization. Please sign in again.");
        }
        throw new Error("Failed to remove saved activity");
      }

      setSavedActivities((current) =>
        savedItem.id !== undefined
          ? current.filter((item) => item.id !== savedItem.id)
          : current.filter((item) => item.activityId !== activityId),
      );
      notify("Activity removed.", "Success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      notify(`Cannot remove activity: ${message}`, "Error");
    } finally {
      setRemovingIds((current) => {
        const next = new Set(current);
        next.delete(activityId);
        return next;
      });
    }
  };

  const pickFile = (file: File | null) => {
    if (file && !file.name.toLowerCase().endsWith(".fit")) {
      notify("Only .fit files can be imported.", "Warning");
      return;
    }
    setSelectedFitFile(file);
  };

  const handleFitFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    pickFile(event.target.files?.[0] ?? null);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    pickFile(event.dataTransfer.files?.[0] ?? null);
  };

  const clearFile = () => {
    setSelectedFitFile(null);
    if (fitFileInputRef.current) fitFileInputRef.current.value = "";
  };

  const uploadFitFile = async () => {
    if (!selectedFitFile) {
      notify("Choose a FIT file first.", "Info");
      return;
    }

    try {
      setUploadingFitFile(true);

      const formData = new FormData();
      formData.append("file", selectedFitFile);

      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.strava.saveFromFile),
        { method: "POST", credentials: "include", body: formData },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No authorization. Please sign in again.");
        }

        const errorPayload = await response.json().catch(() => null);
        throw new Error(
          typeof errorPayload?.message === "string"
            ? errorPayload.message
            : "Failed to save activity from FIT file",
        );
      }

      notify("Training imported.", "Success");
      clearFile();
      await fetchSavedActivities();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      notify(`Cannot import FIT file: ${message}`, "Error");
    } finally {
      setUploadingFitFile(false);
    }
  };

  // Only file imports can be planned from here - Strava activities keep their own tab.
  const planActivityOptions = useMemo<PlanActivityOption[]>(
    () =>
      sortedSavedActivities
        .filter((item) => item.sourceType === "FILE" && item.id !== undefined)
        .map((item) => ({
          id: String(item.id),
          name: item.sourceFileName || item.activity?.name || "Imported activity",
          type: item.activity?.type ?? "",
          start_date: item.activity?.start_date ?? item.savedAt ?? "",
        })),
    [sortedSavedActivities],
  );

  const createIntervalPlan = async (values: CreatePlanFormValues) => {
    try {
      setIsCreatingPlan(true);

      const workoutFocus = trainingTypeApiMap[values.trainingType];
      let endpoint: string;

      if (values.activitySource === "specific") {
        if (values.selectedActivityIds.length === 0) {
          throw new Error("Select at least one activity.");
        }
        endpoint = API_CONFIG.endpoints.user.detailedCertainActivities(workoutFocus);
      } else {
        const activityCount = values.lastActivitiesCount;
        if (
          typeof activityCount !== "number" ||
          activityCount < 1 ||
          activityCount > 20
        ) {
          throw new Error("Use a value from 1 to 20 for last activities.");
        }
        endpoint = API_CONFIG.endpoints.user.detailedActivities(
          workoutFocus,
          values.activityType,
          activityCount,
        );
      }

      const response = await fetch(buildApiUrl(endpoint), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body:
          values.activitySource === "specific"
            ? JSON.stringify({ activityIds: values.selectedActivityIds })
            : undefined,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No authorization. Please sign in again.");
        }

        const errorPayload = await response.json().catch(() => null);
        throw new Error(
          typeof errorPayload?.error === "string"
            ? errorPayload.error
            : "Failed to create interval plan",
        );
      }

      notify("Interval plan created. Open Plans to read it.", "Success");
      setIsCreatePlanOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      notify(`Cannot create interval plan: ${message}`, "Error");
    } finally {
      setIsCreatingPlan(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activities"
        description="Everything you kept from Strava plus the FIT files you imported yourself."
        actions={
          <>
            <Button variant="ghost" onClick={fetchSavedActivities} disabled={loading}>
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
        }
      />

      {/* FIT import */}
      <div className="space-y-3">
        <label
          htmlFor="fit-upload"
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center",
            "transition-[border-color,background-color] duration-[160ms] ease-out-quint",
            isDragging
              ? "border-primary bg-primary/8"
              : "border-border-strong bg-surface-muted/40 hover:border-primary/50 hover:bg-surface-muted",
          )}
        >
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-xl border border-border bg-card",
              isDragging ? "text-primary" : "text-muted-foreground",
            )}
          >
            <UploadCloudIcon className="size-5" />
          </span>
          <span className="text-[13.5px] font-medium">
            Drop a <span className="text-primary">.fit</span> file here, or click to browse
          </span>
          <span className="text-[12px] text-muted-foreground">
            Imported sessions can be turned into interval plans without Strava.
          </span>
          <input
            ref={fitFileInputRef}
            id="fit-upload"
            type="file"
            accept=".fit"
            onChange={handleFitFileSelection}
            className="sr-only"
          />
        </label>

        {selectedFitFile && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-muted px-3 py-2.5">
            <FileUpIcon className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate text-[13px]">
              {selectedFitFile.name}
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={uploadFitFile}
              disabled={uploadingFitFile}
            >
              {uploadingFitFile ? "Importing…" : "Import"}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={clearFile}
              disabled={uploadingFitFile}
              aria-label="Clear selected file"
            >
              <XIcon />
            </Button>
          </div>
        )}
      </div>

      {/* Saved list */}
      <section className="space-y-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Saved sessions</h2>
          {!loading && (
            <span className="tnum text-[12.5px] text-muted-foreground">
              {sortedSavedActivities.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-[9.5rem] w-full rounded-xl" />
            ))}
          </div>
        ) : sortedSavedActivities.length === 0 ? (
          <Card>
            <EmptyState
              icon={<BookmarkIcon />}
              title="Nothing saved yet"
              description="Save an activity from the Strava tab, or import a FIT file above, and it will live here."
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedSavedActivities.map((savedItem, index) => (
              <div
                key={`${savedItem.id ?? savedItem.activityId ?? index}-${savedItem.savedAt ?? "na"}`}
                className="stagger-item"
                style={{ "--stagger-index": Math.min(index, 6) } as React.CSSProperties}
              >
              <ActivityCard
                activity={savedItem.activity}
                eyebrow={
                  savedItem.sourceType === "FILE"
                    ? `Imported ${formatRelative(savedItem.savedAt) || "recently"}${savedItem.sourceFileName ? ` · ${savedItem.sourceFileName}` : ""}`
                    : `Saved ${formatRelative(savedItem.savedAt) || "recently"}`
                }
                onUnsaveClick={
                  savedItem.activityId !== null
                    ? () => removeSavedActivity(savedItem)
                    : undefined
                }
                isRemoving={
                  savedItem.activityId !== null && removingIds.has(savedItem.activityId)
                }
              />
              </div>
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
        filterByActivityType={false}
        noActivitiesHint="No imported activities yet. Upload a FIT file first."
      />
    </div>
  );
}
