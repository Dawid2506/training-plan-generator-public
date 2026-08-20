import { useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon, HeartPulseIcon, ShieldAlertIcon, TimerIcon, ZapIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_CONFIG, buildApiUrl } from "@/lib/api";

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

type CoachNotes = {
  insight: string;
  safety_warning: string;
};

type IntervalPlan = {
  workout_header: WorkoutHeader;
  warmup: WorkoutPhase;
  cooldown: WorkoutPhase;
  main_set: MainSet;
  coach_notes: CoachNotes;
};

type PlanApiPayload = {
  success?: unknown;
  data?: unknown;
  plan?: unknown;
  id?: unknown;
  userId?: unknown;
  createdAt?: unknown;
  workout_header?: unknown;
  warmup?: unknown;
  cooldown?: unknown;
  main_set?: unknown;
  coach_notes?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const asString = (value: unknown, fallback = "-") => {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
};

const asNumber = (value: unknown, fallback = 0) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const hasPlanSections = (value: unknown): value is Record<string, unknown> => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRecord(value.workout_header) ||
    isRecord(value.warmup) ||
    isRecord(value.cooldown) ||
    isRecord(value.main_set) ||
    isRecord(value.coach_notes)
  );
};

const resolvePlanRoot = (payload: unknown): Record<string, unknown> | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const directPlan = isRecord(payload.plan) ? payload.plan : null;
  const nestedData = isRecord(payload.data) ? payload.data : null;
  const nestedDataPlan = nestedData && isRecord(nestedData.plan) ? nestedData.plan : null;

  if (hasPlanSections(payload)) {
    return payload;
  }

  if (hasPlanSections(directPlan)) {
    return directPlan;
  }

  if (hasPlanSections(nestedDataPlan)) {
    return nestedDataPlan;
  }

  if (hasPlanSections(nestedData)) {
    return nestedData;
  }

  return null;
};

const parseIntervalPlan = (payload: unknown): IntervalPlan | null => {
  const root = resolvePlanRoot(payload);

  if (!root) {
    return null;
  }

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
      estimated_total_duration_min: asNumber(header.estimated_total_duration_min)
    },
    warmup: {
      duration_min: asNumber(warmup.duration_min),
      target_hr: asString(warmup.target_hr),
      target_pace_or_speed: asString(warmup.target_pace_or_speed),
      instruction: asString(warmup.instruction)
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
      recovery_type: asString(mainSet.recovery_type)
    },
    cooldown: {
      duration_min: asNumber(cooldown.duration_min),
      target_hr: asString(cooldown.target_hr),
      target_pace_or_speed: asString(cooldown.target_pace_or_speed),
      instruction: asString(cooldown.instruction)
    },
    coach_notes: {
      insight: asString(notes.insight),
      safety_warning: asString(notes.safety_warning)
    }
  };
};

const formatSeconds = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "-";
  }

  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;

  if (restSeconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes} min ${restSeconds} sec`;
};

const formatDistance = (meters: number) => {
  if (!Number.isFinite(meters) || meters <= 0) {
    return "-";
  }

  return `${meters} m`;
};

const IntervalPlanDetailsPage = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<IntervalPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      setIsLoading(true);
      setInfoMessage(null);

      if (!planId) {
        setInfoMessage("No plan ID found in URL.");
        setIsLoading(false);
        return;
      }

      try {
        const detailsResponse = await fetch(
          buildApiUrl(API_CONFIG.endpoints.intervalPlans.details(planId)),
          {
            credentials: API_CONFIG.defaultOptions.credentials
          }
        );

        if (detailsResponse.ok) {
          const detailsPayload: PlanApiPayload = await detailsResponse.json();
          const parsed = parseIntervalPlan(detailsPayload);

          if (parsed) {
            setPlan(parsed);
            return;
          }
        }

        const fallbackResponse = await fetch(
          buildApiUrl(API_CONFIG.endpoints.intervalPlans.paginated({ page: 1, limit: 100 })),
          {
            credentials: API_CONFIG.defaultOptions.credentials
          }
        );

        if (fallbackResponse.ok) {
          const fallbackPayload = await fallbackResponse.json();
          const items = Array.isArray(fallbackPayload?.data?.items) ? fallbackPayload.data.items : [];
          const matchedPlan = items.find((item: { id?: string; plan?: unknown }) => item?.id === planId);

          if (matchedPlan) {
            const parsed = parseIntervalPlan(matchedPlan.plan ?? matchedPlan);
            if (parsed) {
              setPlan(parsed);
              return;
            }
          }
        }
      } catch {
        setInfoMessage("Error while loading plan.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPlan();
  }, [planId]);

  const totalMainSetMinutes = useMemo(() => {
    if (!plan) {
      return 0;
    }

    const singleRoundSeconds = plan.main_set.work_duration_sec + plan.main_set.recovery_duration_sec;
    return Math.round((singleRoundSeconds * plan.main_set.repeats) / 60);
  }, [plan]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-first px-4 py-8 text-white md:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <Card>
            <CardHeader>
              <CardTitle>Loading interval plan...</CardTitle>
              <CardDescription>Please wait, we are preparing your workout details.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-first px-4 py-8 text-white md:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <Card>
            <CardHeader>
              <CardTitle>Plan not found</CardTitle>
              <CardDescription>The selected training plan could not be displayed.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" onClick={() => navigate("/main?tab=Strava")}>Back to dashboard</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-first px-4 py-8 text-white md:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Button variant="outline" size="sm" onClick={() => navigate("/main?tab=Strava")}
        >
          <ArrowLeftIcon /> Back
        </Button>

        {infoMessage && (
          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardContent className="py-4 text-amber-200">{infoMessage}</CardContent>
          </Card>
        )}

        <Card className="border-third bg-card/90">
          <CardHeader>
            <CardDescription>Training blueprint</CardDescription>
            <CardTitle className="text-2xl text-white md:text-3xl">{plan.workout_header.title}</CardTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{plan.workout_header.sport}</Badge>
              <Badge className="bg-blue-600/20 text-blue-300 hover:bg-blue-600/20">
                {plan.workout_header.category}
              </Badge>
              <Badge className="bg-rose-600/20 text-rose-300 hover:bg-rose-600/20">
                Difficulty {plan.workout_header.difficulty_score}/10
              </Badge>
              <Badge className="bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/20">
                {plan.workout_header.estimated_total_duration_min} min total
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="border-third">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TimerIcon className="size-4" /> Warmup
              </CardTitle>
              <CardDescription>{plan.warmup.instruction}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">Duration: <span className="text-white">{plan.warmup.duration_min} min</span></p>
              <p className="text-sm text-muted-foreground">Target HR: <span className="text-white">{plan.warmup.target_hr}</span></p>
              <p className="text-sm text-muted-foreground">Pace / Speed: <span className="text-white">{plan.warmup.target_pace_or_speed}</span></p>
            </CardContent>
          </Card>

          <Card className="border-third">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <HeartPulseIcon className="size-4" /> Cooldown
              </CardTitle>
              <CardDescription>{plan.cooldown.instruction}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">Duration: <span className="text-white">{plan.cooldown.duration_min} min</span></p>
              <p className="text-sm text-muted-foreground">Target HR: <span className="text-white">{plan.cooldown.target_hr}</span></p>
              <p className="text-sm text-muted-foreground">Pace / Speed: <span className="text-white">{plan.cooldown.target_pace_or_speed}</span></p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-third">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <ZapIcon className="size-4" /> Main Set
            </CardTitle>
            <CardDescription>
              {plan.main_set.repeats} repeats, approximately {totalMainSetMinutes} min for the whole interval block.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Block</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Target HR</TableHead>
                  <TableHead>Pace / Speed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Work</TableCell>
                  <TableCell>{formatSeconds(plan.main_set.work_duration_sec)}</TableCell>
                  <TableCell>{formatDistance(plan.main_set.work_distance_meters)}</TableCell>
                  <TableCell>{plan.main_set.work_target_hr}</TableCell>
                  <TableCell>{plan.main_set.work_target_pace_or_speed}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{plan.main_set.recovery_type}</TableCell>
                  <TableCell>{formatSeconds(plan.main_set.recovery_duration_sec)}</TableCell>
                  <TableCell>{formatDistance(plan.main_set.recovery_distance_meters)}</TableCell>
                  <TableCell>{plan.main_set.recovery_target_hr}</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-third">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <ShieldAlertIcon className="size-4" /> Coach Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Insight</p>
              <p className="text-sm text-white">{plan.coach_notes.insight}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Safety warning</p>
              <p className="text-sm text-white">{plan.coach_notes.safety_warning}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IntervalPlanDetailsPage;
