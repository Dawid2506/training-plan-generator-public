import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  DownloadIcon,
  HeartPulseIcon,
  LightbulbIcon,
  ShieldAlertIcon,
  TimerIcon,
  ZapIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SportBadge } from "@/components/ui/sport-badge";
import { Stat } from "@/components/ui/stat";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_CONFIG, buildApiUrl } from "@/lib/api";
import { notify } from "@/lib/notify";
import { formatMeters, formatSeconds } from "@/lib/format";
import { cn } from "@/lib/utils";

type WorkoutHeader = {
  sport: string;
  title: string;
  category: string;
  difficulty_score: number;
  estimated_total_duration_min: number;
};

type WorkoutPhase = {
  target_hr: string;
  instruction: string;
  duration_min: number;
  target_pace_or_speed: string;
};

type MainSet = {
  repeats: number;
  recovery_type: string;
  work_target_hr: string;
  work_duration_sec: number;
  recovery_target_hr: string;
  work_distance_meters: number;
  recovery_duration_sec: number;
  recovery_distance_meters: number;
  work_target_pace_or_speed: string;
};

type IntervalPlan = {
  workout_header: WorkoutHeader;
  warmup: WorkoutPhase;
  cooldown: WorkoutPhase;
  main_set: MainSet;
  coach_notes: { insight: string; safety_warning: string };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown, fallback = "-") =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

const asNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const hasPlanSections = (value: unknown): value is Record<string, unknown> => {
  if (!isRecord(value)) return false;
  return (
    isRecord(value.workout_header) ||
    isRecord(value.warmup) ||
    isRecord(value.cooldown) ||
    isRecord(value.main_set) ||
    isRecord(value.coach_notes)
  );
};

const resolvePlanRoot = (payload: unknown): Record<string, unknown> | null => {
  if (!isRecord(payload)) return null;

  const directPlan = isRecord(payload.plan) ? payload.plan : null;
  const nestedData = isRecord(payload.data) ? payload.data : null;
  const nestedDataPlan = nestedData && isRecord(nestedData.plan) ? nestedData.plan : null;

  if (hasPlanSections(payload)) return payload;
  if (hasPlanSections(directPlan)) return directPlan;
  if (hasPlanSections(nestedDataPlan)) return nestedDataPlan;
  if (hasPlanSections(nestedData)) return nestedData;

  return null;
};

const parseIntervalPlan = (payload: unknown): IntervalPlan | null => {
  const root = resolvePlanRoot(payload);
  if (!root) return null;

  const header = isRecord(root.workout_header) ? root.workout_header : {};
  const warmup = isRecord(root.warmup) ? root.warmup : {};
  const cooldown = isRecord(root.cooldown) ? root.cooldown : {};
  const mainSet = isRecord(root.main_set) ? root.main_set : {};
  const notes = isRecord(root.coach_notes) ? root.coach_notes : {};

  return {
    workout_header: {
      title: asString(header.title, "Untitled plan"),
      sport: asString(header.sport),
      category: asString(header.category),
      difficulty_score: asNumber(header.difficulty_score),
      estimated_total_duration_min: asNumber(header.estimated_total_duration_min),
    },
    warmup: {
      duration_min: asNumber(warmup.duration_min),
      target_hr: asString(warmup.target_hr),
      target_pace_or_speed: asString(warmup.target_pace_or_speed),
      instruction: asString(warmup.instruction),
    },
    main_set: {
      repeats: asNumber(mainSet.repeats, 1),
      work_duration_sec: asNumber(mainSet.work_duration_sec),
      work_distance_meters: asNumber(mainSet.work_distance_meters),
      work_target_hr: asString(mainSet.work_target_hr),
      work_target_pace_or_speed: asString(mainSet.work_target_pace_or_speed),
      recovery_duration_sec: asNumber(mainSet.recovery_duration_sec),
      recovery_distance_meters: asNumber(mainSet.recovery_distance_meters),
      recovery_target_hr: asString(mainSet.recovery_target_hr),
      recovery_type: asString(mainSet.recovery_type),
    },
    cooldown: {
      duration_min: asNumber(cooldown.duration_min),
      target_hr: asString(cooldown.target_hr),
      target_pace_or_speed: asString(cooldown.target_pace_or_speed),
      instruction: asString(cooldown.instruction),
    },
    coach_notes: {
      insight: asString(notes.insight),
      safety_warning: asString(notes.safety_warning),
    },
  };
};

/**
 * The session drawn to scale: warmup, every work/recovery rep, then cooldown.
 * One glance answers "how hard, for how long, how many times".
 */
function IntervalTimeline({ plan }: { plan: IntervalPlan }) {
  const warmupSec = plan.warmup.duration_min * 60;
  const cooldownSec = plan.cooldown.duration_min * 60;
  const { repeats, work_duration_sec: work, recovery_duration_sec: recovery } =
    plan.main_set;

  const total = warmupSec + cooldownSec + repeats * (work + recovery);
  if (total <= 0) return null;

  const segments: { key: string; kind: "warmup" | "work" | "recovery" | "cooldown"; seconds: number }[] =
    [];

  if (warmupSec > 0) segments.push({ key: "warmup", kind: "warmup", seconds: warmupSec });
  for (let index = 0; index < Math.min(repeats, 40); index += 1) {
    if (work > 0) segments.push({ key: `work-${index}`, kind: "work", seconds: work });
    if (recovery > 0)
      segments.push({ key: `recovery-${index}`, kind: "recovery", seconds: recovery });
  }
  if (cooldownSec > 0)
    segments.push({ key: "cooldown", kind: "cooldown", seconds: cooldownSec });

  const tone = {
    warmup: "bg-info/45",
    work: "bg-primary",
    recovery: "bg-border-strong",
    cooldown: "bg-info/45",
  } as const;

  return (
    <div className="space-y-3">
      <div className="timeline-reveal flex h-12 w-full gap-[2px] overflow-hidden rounded-lg bg-surface-muted p-1">
        {segments.map((segment) => (
          <div
            key={segment.key}
            title={`${segment.kind} · ${formatSeconds(segment.seconds)}`}
            style={{ flexGrow: segment.seconds, flexBasis: 0 }}
            className={cn("min-w-[2px] rounded-[3px]", tone[segment.kind])}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-muted-foreground">
        {[
          { label: "Warm-up", className: "bg-info/45" },
          { label: "Work", className: "bg-primary" },
          { label: "Recovery", className: "bg-border-strong" },
          { label: "Cool-down", className: "bg-info/45" },
        ].map((legend) => (
          <span key={legend.label} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-[2px]", legend.className)} />
            {legend.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function PhaseCard({
  icon,
  title,
  phase,
}: {
  icon: React.ReactNode;
  title: string;
  phase: WorkoutPhase;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
          {title}
        </CardTitle>
        <CardDescription>{phase.instruction}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4">
        <Stat label="Duration" value={phase.duration_min} unit="min" />
        <Stat label="Target HR" value={phase.target_hr} />
        <Stat label="Pace / speed" value={phase.target_pace_or_speed} />
      </CardContent>
    </Card>
  );
}

export default function PlanDetailsPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<IntervalPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      setIsLoading(true);

      if (!planId) {
        setIsLoading(false);
        return;
      }

      try {
        const detailsResponse = await fetch(
          buildApiUrl(API_CONFIG.endpoints.intervalPlans.details(planId)),
          { credentials: API_CONFIG.defaultOptions.credentials },
        );

        if (detailsResponse.ok) {
          const parsed = parseIntervalPlan(await detailsResponse.json());
          if (parsed) {
            setPlan(parsed);
            return;
          }
        }

        // Older records are only reachable through the paginated list.
        const fallbackResponse = await fetch(
          buildApiUrl(
            API_CONFIG.endpoints.intervalPlans.paginated({ page: 1, limit: 100 }),
          ),
          { credentials: API_CONFIG.defaultOptions.credentials },
        );

        if (fallbackResponse.ok) {
          const fallbackPayload = await fallbackResponse.json();
          const items = Array.isArray(fallbackPayload?.data?.items)
            ? fallbackPayload.data.items
            : [];
          const matched = items.find(
            (item: { id?: string }) => item?.id === planId,
          );

          if (matched) {
            const parsed = parseIntervalPlan(matched.plan ?? matched);
            if (parsed) setPlan(parsed);
          }
        }
      } catch {
        setPlan(null);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPlan();
  }, [planId]);

  /**
   * The endpoint authenticates with the session cookie, so the file is fetched
   * and handed to a temporary object URL rather than linked to directly.
   */
  const handleDownloadFit = async () => {
    if (!planId) return;

    setIsDownloading(true);

    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.endpoints.intervalPlans.fit(planId)),
        { credentials: API_CONFIG.defaultOptions.credentials },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        notify(
          payload?.error ?? "Could not build the workout file for this plan.",
          "Error",
        );
        return;
      }

      const fileName =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "workout.fit";

      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      notify("Could not download the workout file.", "Error");
    } finally {
      setIsDownloading(false);
    }
  };

  const totalMainSetMinutes = useMemo(() => {
    if (!plan) return 0;
    const roundSeconds =
      plan.main_set.work_duration_sec + plan.main_set.recovery_duration_sec;
    return Math.round((roundSeconds * plan.main_set.repeats) / 60);
  }, [plan]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <Card>
        <EmptyState
          icon={<ZapIcon />}
          title="Plan not found"
          description="This training plan could not be loaded. It may have been removed."
          action={
            <Button variant="primary" onClick={() => navigate("/plans")}>
              Back to plans
            </Button>
          }
        />
      </Card>
    );
  }

  const { workout_header: header, main_set: mainSet } = plan;
  /** What the sport is called in the watch's own activity list. */
  const watchActivityName = header.sport === "Ride" ? "Bike" : "Run";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/plans")}>
          <ArrowLeftIcon />
          All plans
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={handleDownloadFit}
          disabled={isDownloading}
        >
          <DownloadIcon />
          {isDownloading ? "Preparing file..." : "Download for Garmin (.FIT)"}
        </Button>
      </div>

      <details className="group rounded-lg border border-border bg-surface-muted/40 px-4 py-3">
        <summary className="cursor-pointer list-none text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
          How to load this workout onto a Garmin watch
        </summary>
        <ol className="mt-3 space-y-1.5 pl-4 text-[13px] leading-relaxed text-muted-foreground [&>li]:list-decimal">
          <li>Download the .FIT file and connect your watch with the USB cable.</li>
          <li>
            Copy the file into the <code className="tnum">GARMIN/NewFiles</code>{" "}
            folder on the watch.
          </li>
          <li>
            Eject the watch, unplug the cable, and give it a moment to pick the
            file up.
          </li>
          <li>
            On the watch, press the start button and select the{" "}
            <span className="text-foreground">{watchActivityName}</span> activity
            - the workout only shows up under the activity it was built for.
          </li>
          <li>
            Swipe up, select <span className="text-foreground">Workouts</span>,
            and pick this workout from the list.
          </li>
        </ol>
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
          If it is not in the list, plug the watch back in: a file still sitting
          in <code className="tnum">GARMIN/NewFiles</code> was never processed -
          copy it into <code className="tnum">GARMIN/Workouts</code> instead and
          restart the watch. Works on any Garmin that supports structured
          workouts - no Connect subscription needed.
        </p>
      </details>

      <Card>
        <CardHeader>
          <p className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
            Training blueprint
          </p>
          <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.02em] md:text-[28px]">
            {header.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <SportBadge type={header.sport} />
            <Badge variant="muted">{header.category}</Badge>
            <Badge variant="primary">Difficulty {header.difficulty_score}/10</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Stat
              emphasis="large"
              label="Total"
              value={header.estimated_total_duration_min}
              unit="min"
            />
            <Stat emphasis="large" label="Repeats" value={mainSet.repeats} unit="×" />
            <Stat
              emphasis="large"
              label="Work"
              value={formatSeconds(mainSet.work_duration_sec)}
            />
            <Stat
              emphasis="large"
              label="Main block"
              value={totalMainSetMinutes}
              unit="min"
            />
          </div>

          <IntervalTimeline plan={plan} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <PhaseCard
          icon={<TimerIcon />}
          title="Warm-up"
          phase={plan.warmup}
        />
        <PhaseCard
          icon={<HeartPulseIcon />}
          title="Cool-down"
          phase={plan.cooldown}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-primary [&_svg]:size-4">
              <ZapIcon />
            </span>
            Main set
          </CardTitle>
          <CardDescription>
            {mainSet.repeats} repeats · about {totalMainSetMinutes} min for the whole block.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-surface-muted/50 hover:bg-surface-muted/50">
                  <TableHead>Block</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Target HR</TableHead>
                  <TableHead>Pace / speed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <span className="flex items-center gap-2 font-medium">
                      <span className="size-2 rounded-[2px] bg-primary" />
                      Work
                    </span>
                  </TableCell>
                  <TableCell className="tnum">
                    {formatSeconds(mainSet.work_duration_sec)}
                  </TableCell>
                  <TableCell className="tnum">
                    {formatMeters(mainSet.work_distance_meters)}
                  </TableCell>
                  <TableCell>{mainSet.work_target_hr}</TableCell>
                  <TableCell>{mainSet.work_target_pace_or_speed}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <span className="flex items-center gap-2 font-medium">
                      <span className="size-2 rounded-[2px] bg-border-strong" />
                      {mainSet.recovery_type}
                    </span>
                  </TableCell>
                  <TableCell className="tnum">
                    {formatSeconds(mainSet.recovery_duration_sec)}
                  </TableCell>
                  <TableCell className="tnum">
                    {formatMeters(mainSet.recovery_distance_meters)}
                  </TableCell>
                  <TableCell>{mainSet.recovery_target_hr}</TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-info [&_svg]:size-4">
                <LightbulbIcon />
              </span>
              Coach insight
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[13.5px] leading-relaxed text-muted-foreground">
            {plan.coach_notes.insight}
          </CardContent>
        </Card>

        <Card className="border-warning/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-warning [&_svg]:size-4">
                <ShieldAlertIcon />
              </span>
              Safety
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[13.5px] leading-relaxed text-muted-foreground">
            {plan.coach_notes.safety_warning}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
