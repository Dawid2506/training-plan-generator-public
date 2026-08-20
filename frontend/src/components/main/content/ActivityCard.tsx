import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StravaActivity } from "@/types/strava";

interface ActivityCardProps {
  activity: StravaActivity;
  onSaveClick?: () => void;
  onUnsaveClick?: () => void;
  isSaved?: boolean;
  isSaving?: boolean;
  isRemoving?: boolean;
}

const ActivityCard = ({
  activity,
  onSaveClick,
  onUnsaveClick,
  isSaved = false,
  isSaving = false,
  isRemoving = false,
}: ActivityCardProps) => {
  const asFiniteNumber = (value: number | string) => {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const formatDistance = (value: number | string) => {
    const numericValue = asFiniteNumber(value);
    if (numericValue === null) {
      return String(value);
    }
    return `${(numericValue / 1000).toFixed(1)} km`;
  };

  const formatDuration = (value: number | string) => {
    const numericValue = asFiniteNumber(value);
    if (numericValue === null) {
      return String(value);
    }

    const totalSeconds = Math.max(0, Math.floor(numericValue));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const formatSpeed = (value: number | string) => {
    const numericValue = asFiniteNumber(value);
    if (numericValue === null) {
      return String(value);
    }
    return `${(numericValue * 3.6).toFixed(1)} km/h`;
  };

  const formatElevation = (value: number | string) => {
    const numericValue = asFiniteNumber(value);
    if (numericValue === null) {
      return String(value);
    }
    return `${Math.round(numericValue)} m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderAction = () => {
    if (onUnsaveClick) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={onUnsaveClick}
          disabled={isRemoving}
          className="whitespace-nowrap"
        >
          {isRemoving ? "Removing..." : "Remove"}
        </Button>
      );
    }

    if (onSaveClick) {
      return (
        <Button
          variant={isSaved ? "secondary" : "outline"}
          size="sm"
          onClick={onSaveClick}
          disabled={isSaved || isSaving}
          className="whitespace-nowrap"
        >
          {isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}
        </Button>
      );
    }

    return null;
  };

  return (
    <Card className="mb-4 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{activity.name}</CardTitle>
          <span className="text-sm px-2 py-1 rounded">
            {activity.type}
          </span>
        </div>
        <CardDescription>{formatDate(activity.start_date)}</CardDescription>
      </CardHeader>
      <CardFooter>
        <div className="flex w-full items-end justify-between gap-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
            <div>
              <div className="font-semibold text-gray-600">Distance</div>
              <div className="text-lg">{formatDistance(activity.distance)}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-600">Moving Time</div>
              <div className="text-lg">{formatDuration(activity.moving_time)}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-600">Avg Speed</div>
              <div className="text-lg">{formatSpeed(activity.average_speed)}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-600">Elevation</div>
              <div className="text-lg">{formatElevation(activity.total_elevation_gain)}</div>
            </div>
            {activity.average_heartrate && (
              <>
                <div>
                  <div className="font-semibold text-gray-600">Avg HR</div>
                  <div className="text-lg">
                    {Math.round(activity.average_heartrate)} bpm
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-600">Max HR</div>
                  <div className="text-lg">{activity.max_heartrate} bpm</div>
                </div>
              </>
            )}
          </div>
          {renderAction()}
        </div>
      </CardFooter>
    </Card>
  );
};

export default ActivityCard;
