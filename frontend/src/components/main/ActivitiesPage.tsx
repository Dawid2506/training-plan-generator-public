import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ActivityCard from "./content/ActivityCard";
import { useNotifications } from "../common/NotificationsProvider";
import { API_CONFIG, buildApiUrl } from "@/lib/api";
import { normalizeSavedActivitiesPayload } from "@/lib/stravaActivityParser";
import { SavedActivity } from "@/types/strava";

const ActivitiesPage = () => {
  const { notify } = useNotifications();
  const [savedActivities, setSavedActivities] = useState<SavedActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const [selectedFitFile, setSelectedFitFile] = useState<File | null>(null);
  const [uploadingFitFile, setUploadingFitFile] = useState(false);
  const fitFileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchSavedActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.user.activities),
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No authorization. Please sign in again.");
        }
        throw new Error("Failed to load saved activities");
      }

      const payload = await response.json();
      const normalized = normalizeSavedActivitiesPayload(payload);
      setSavedActivities(normalized);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      notify(`Cannot load saved activities: ${message}`, "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSavedActivities();
  }, []);

  const sortedSavedActivities = useMemo(() => {
    return [...savedActivities].sort((a, b) => {
      const aTime = a.savedAt ? new Date(a.savedAt).getTime() : 0;
      const bTime = b.savedAt ? new Date(b.savedAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [savedActivities]);

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
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No authorization. Please sign in again.");
        }
        throw new Error("Failed to remove saved activity");
      }

      setSavedActivities((current) => {
        if (savedItem.id !== undefined) {
          return current.filter((item) => item.id !== savedItem.id);
        }

        return current.filter((item) => item.activityId !== activityId);
      });
      notify("Activity removed from saved list.", "Success");
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

  const handleFitFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFitFile(file);
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
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No authorization. Please sign in again.");
        }

        const errorPayload = await response.json().catch(() => null);
        const message =
          typeof errorPayload?.message === "string"
            ? errorPayload.message
            : "Failed to save activity from FIT file";
        throw new Error(message);
      }

      notify("Training imported successfully.", "Success");
      setSelectedFitFile(null);
      if (fitFileInputRef.current) {
        fitFileInputRef.current.value = "";
      }
      await fetchSavedActivities();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      notify(`Cannot import FIT file: ${message}`, "Error");
    } finally {
      setUploadingFitFile(false);
    }
  };

  const formatSavedAt = (savedAt?: string) => {
    if (!savedAt) {
      return "Saved recently";
    }

    const parsedDate = new Date(savedAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return "Saved recently";
    }

    return `Saved ${parsedDate.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  return (
    <div className="h-full w-full p-4 text-black">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-xl">Saved Activities</CardTitle>
          <Button variant="outline" onClick={fetchSavedActivities} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="text-sm text-gray-500">
          Activities saved from the Strava tab. Use this list for later review and planning.
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Import FIT Training</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fitFileInputRef}
            type="file"
            accept=".fit"
            onChange={handleFitFileSelection}
            className="text-sm"
          />
          {selectedFitFile && (
            <p className="text-sm text-gray-600">Selected: {selectedFitFile.name}</p>
          )}
          <div className="flex gap-2">
            <Button
              onClick={uploadFitFile}
              disabled={!selectedFitFile || uploadingFitFile}
            >
              {uploadingFitFile ? "Importing..." : "Import FIT file"}
            </Button>
            {selectedFitFile && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFitFile(null);
                  if (fitFileInputRef.current) {
                    fitFileInputRef.current.value = "";
                  }
                }}
                disabled={uploadingFitFile}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {sortedSavedActivities.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No saved activities yet. Open Strava tab and save activities to see them here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedSavedActivities.map((savedItem, index) => (
            <div key={`${savedItem.id ?? savedItem.activityId ?? `activity-${index}`}-${savedItem.savedAt ?? "na"}`}>
              <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">
                {formatSavedAt(savedItem.savedAt)}
              </p>
              <ActivityCard
                activity={savedItem.activity}
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
    </div>
  );
};

export default ActivitiesPage;
