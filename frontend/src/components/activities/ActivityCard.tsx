import { BookmarkCheckIcon, BookmarkPlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SportBadge } from "@/components/ui/sport-badge";
import { Stat } from "@/components/ui/stat";
import { normalizeActivityType } from "@/lib/activityType";
import {
  durationUnit,
  formatDateTime,
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  formatSpeed,
} from "@/lib/format";
import type { StravaActivity } from "@/types/strava";

interface ActivityCardProps {
  activity: StravaActivity;
  onSaveClick?: () => void;
  onUnsaveClick?: () => void;
  isSaved?: boolean;
  isSaving?: boolean;
  isRemoving?: boolean;
  /** Extra line above the title, e.g. "Saved 2 days ago" or a file name. */
  eyebrow?: string;
}

export function ActivityCard({
  activity,
  onSaveClick,
  onUnsaveClick,
  isSaved = false,
  isSaving = false,
  isRemoving = false,
  eyebrow,
}: ActivityCardProps) {
  const isRun = normalizeActivityType(activity.type) === "Run";
  const hasHeartRate = Boolean(activity.average_heartrate);

  return (
    <Card interactive className="gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4">
        <div className="min-w-0 space-y-1.5">
          {eyebrow && (
            <p className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
              {eyebrow}
            </p>
          )}
          <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em]">
            {activity.name}
          </h3>
          <p className="tnum text-[12.5px] text-muted-foreground">
            {formatDateTime(activity.start_date)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <SportBadge type={activity.type} />

          {onUnsaveClick && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onUnsaveClick}
              disabled={isRemoving}
              aria-label="Remove saved activity"
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2Icon />
            </Button>
          )}

          {onSaveClick && (
            <Button
              variant={isSaved ? "ghost" : "outline"}
              size="sm"
              onClick={onSaveClick}
              disabled={isSaved || isSaving}
            >
              {isSaved ? <BookmarkCheckIcon /> : <BookmarkPlusIcon />}
              {isSaving ? "Saving" : isSaved ? "Saved" : "Save"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-border bg-surface-muted/40 px-5 py-4 sm:grid-cols-4 lg:grid-cols-6">
        <Stat label="Distance" value={formatDistance(activity.distance)} unit="km" />
        <Stat
          label="Moving"
          value={formatDuration(activity.moving_time)}
          unit={durationUnit(activity.moving_time)}
        />
        {isRun ? (
          <Stat label="Pace" value={formatPace(activity.average_speed)} unit="/km" />
        ) : (
          <Stat label="Avg speed" value={formatSpeed(activity.average_speed)} unit="km/h" />
        )}
        <Stat
          label="Elevation"
          value={formatElevation(activity.total_elevation_gain)}
          unit="m"
        />
        {hasHeartRate && (
          <>
            <Stat
              label="Avg HR"
              value={Math.round(Number(activity.average_heartrate))}
              unit="bpm"
            />
            <Stat label="Max HR" value={activity.max_heartrate ?? "-"} unit="bpm" />
          </>
        )}
      </div>
    </Card>
  );
}
