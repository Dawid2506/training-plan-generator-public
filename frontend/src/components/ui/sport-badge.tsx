import { BikeIcon, ActivityIcon, FootprintsIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { activityTypeLabel, normalizeActivityType } from "@/lib/activityType";

/** One sport, one colour, everywhere it appears. */
function SportBadge({ type, className }: { type: unknown; className?: string }) {
  const normalized = normalizeActivityType(type);
  const variant =
    normalized === "Run" ? "run" : normalized === "Ride" ? "ride" : "other";
  const Icon =
    normalized === "Run" ? FootprintsIcon : normalized === "Ride" ? BikeIcon : ActivityIcon;

  return (
    <Badge variant={variant} className={className}>
      <Icon />
      {activityTypeLabel(type)}
    </Badge>
  );
}

export { SportBadge };
